require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { from: copyFrom } = require('pg-copy-streams');

// Config
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';
const MAPPING_FILE = process.env.MAPPING_FILE || '/Users/mariolabbe/Desktop/base vendedores.xlsx';
const fixedMapPath = path.join(__dirname, '..', 'config', 'vendor_alias_map.json');
let FIXED_ALIAS = {};
try { FIXED_ALIAS = require(fixedMapPath); } catch (_) { FIXED_ALIAS = {}; }

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

function norm(s) {
  return (s == null ? '' : String(s))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && !isNaN(value)) {
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, '0');
      const mm = String(m[2]).padStart(2, '0');
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  return null;
}

async function detectAbonosTable(client) {
  const { rows } = await client.query(`
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='abonos') AS has_abonos,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='abono') AS has_abono
  `);
  const r = rows[0] || {};
  if (r.has_abonos) return 'abonos';
  if (r.has_abono) return 'abono';
  // Default create 'abono' if none exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS abono (
      id SERIAL PRIMARY KEY,
      vendedor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      fecha_abono DATE NOT NULL,
      monto DECIMAL(15, 2) NOT NULL,
      descripcion TEXT,
      folio VARCHAR(50),
      cliente_nombre VARCHAR(255),
      tipo_pago VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return 'abono';
}

async function main() {
  console.log('=== IMPORT ABONOS (FAST) ===');
  // Leer Excel
  const wb = XLSX.readFile(EXCEL_PATH);
  const abonosSheetName = wb.SheetNames.find(n => /abonos/i.test(n));
  if (!abonosSheetName) {
    console.log('No se encontró hoja de abonos en el Excel');
    process.exit(1);
  }
  const sh = wb.Sheets[abonosSheetName];
  const rows = XLSX.utils.sheet_to_json(sh, { raw: true });
  console.log(`Hoja: ${abonosSheetName} | Filas: ${rows.length}`);

  // Detectar columnas (flexible)
  const headers = Object.keys(rows[0] || {});
  const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
  const colFecha = findCol([/^Fecha$/i]);
  const colFolio = findCol([/^Folio$/i]);
  const colCliente = findCol([/^Cliente$/i]);
  const colVendedor = findCol([/^Vendedor\s*cliente$/i, /^Vendedor$/i]);
  const colTipoPago = findCol([/^Tipo\s*pago$/i]);
  const colEstado = findCol([/^Estado\s*abono$/i]);
  const colMonto = findCol([/^Monto$/i]);
  const colMontoTotal = findCol([/^Monto\s*total$/i]);

  if (!colFecha || !colCliente || !(colMonto || colMontoTotal)) {
    console.error('Columnas requeridas no detectadas:', { colFecha, colCliente, colMonto, colMontoTotal });
    process.exit(1);
  }
  console.log('Columnas:', { colFecha, colFolio, colCliente, colVendedor, colTipoPago, colEstado, colMonto, colMontoTotal });

  const client = await pool.connect();
  try {
    // Usuarios
    const usersRes = await client.query("SELECT id, nombre, rol FROM users WHERE rol IN ('vendedor','manager')");
    const usersByNorm = new Map(usersRes.rows.map(u => [norm(u.nombre), u.id]));
    const userRecords = usersRes.rows.map(u => ({ id: u.id, nombre: u.nombre, tokens: norm(u.nombre).split(' ') }));
    const managerId = usersRes.rows.find(u => u.rol === 'manager')?.id || null;

    // Mapeo interno (hoja MAPEO VENDEDORES)
    const aliasMap = new Map();
    const internalMapSheetName = wb.SheetNames.find(n => norm(n) === norm('MAPEO VENDEDORES'));
    if (internalMapSheetName && wb.Sheets[internalMapSheetName]) {
      const mapRows = XLSX.utils.sheet_to_json(wb.Sheets[internalMapSheetName], { raw: true });
      const hdrs = Object.keys(mapRows[0] || {});
      const colAlias = hdrs.find(h => /alias/i.test(h));
      const colUsuario = hdrs.find(h => /usuario|user/i.test(h));
      if (colAlias && colUsuario) {
        for (const r of mapRows) {
          const alias = norm(r[colAlias]);
          const usuario = norm(r[colUsuario]);
          const uid = usersByNorm.get(usuario);
          if (alias && uid) aliasMap.set(alias, uid);
        }
        console.log(`Mapeo interno: ${aliasMap.size} alias`);
      }
    }

    // Mapeo externo por nombre completo
    try {
      if (fs.existsSync(MAPPING_FILE)) {
        const wbMap = XLSX.readFile(MAPPING_FILE);
        const mapSheet = wbMap.Sheets[wbMap.SheetNames[0]];
        const mrows = XLSX.utils.sheet_to_json(mapSheet, { raw: true });
        const hdrs = Object.keys(mrows[0] || {});
        const colNombreVend = hdrs.find(h => /nombre\s*vendedor/i.test(h));
        const colNombre = hdrs.find(h => /^\s*nombre\s*$/i.test(h));
        const colApellido = hdrs.find(h => /apellido(?!.*\d)/i.test(h));
        const colApellido2 = hdrs.find(h => /apellido\s*2/i.test(h));
        let added = 0;
        if (colNombreVend && colNombre && colApellido) {
          for (const r of mrows) {
            const alias = norm(r[colNombreVend]);
            const full = [r[colNombre], r[colApellido], r[colApellido2] || ''].map(x => (x == null ? '' : String(x))).join(' ');
            const usuario = norm(full);
            const uid = usersByNorm.get(usuario);
            if (alias && uid) { if (!aliasMap.has(alias)) added++; aliasMap.set(alias, uid); }
          }
          console.log(`Mapeo externo: +${added} alias (total ${aliasMap.size})`);
        }
      }
    } catch (_) {}

    // Mapeo fijo desde config JSON
    Object.entries(FIXED_ALIAS).forEach(([alias, targetName]) => {
      const u = usersRes.rows.find(u => norm(u.nombre) === norm(targetName));
      if (u) aliasMap.set(norm(alias), u.id);
    });

    // Heurística tokens
    const resolveVendedorId = (aliasRaw) => {
      const alias = norm(aliasRaw);
      if (!alias) return managerId;
      if (aliasMap.has(alias)) return aliasMap.get(alias);
      if (usersByNorm.has(alias)) return usersByNorm.get(alias);
      const aliasTokens = alias.split(' ').filter(Boolean);
      const candidates = userRecords.filter(u => aliasTokens.every(t => u.tokens.includes(t)));
      if (candidates.length === 1) return candidates[0].id;
      const cand2 = userRecords.filter(u => u.tokens[0] === aliasTokens[0]);
      if (cand2.length === 1) return cand2[0].id;
      return managerId;
    };

    const abonosTable = await detectAbonosTable(client);
    console.log('Importando hacia tabla:', abonosTable);

    // Limpiar tabla
    await client.query(`DELETE FROM ${abonosTable}`);

    // Generar CSV
    const csvPath = '/tmp/abonos_import.csv';
    const out = fs.createWriteStream(csvPath);
    let count = 0;
    for (const r of rows) {
      const fecha = parseExcelDate(r[colFecha]);
      const monto = (r[colMonto] != null ? Number(r[colMonto]) : Number(r[colMontoTotal])) || 0;
      if (!fecha || !(monto > 0)) continue;
      const vendedor_id = resolveVendedorId(r[colVendedor]);
      const folio = r[colFolio] == null ? '' : String(r[colFolio]);
      const cliente = (r[colCliente] == null ? '' : String(r[colCliente])).replace(/\t|\n/g, ' ').trim();
      const tipo = (r[colTipoPago] == null ? '' : String(r[colTipoPago])).replace(/\t|\n/g, ' ').trim();
      const estado = (r[colEstado] == null ? '' : String(r[colEstado])).replace(/\t|\n/g, ' ').trim();
      const descripcion = estado ? `Estado: ${estado}` : '';
      out.write(`${vendedor_id || ''}\t${fecha}\t${monto.toFixed(2)}\t${descripcion}\t${folio}\t${cliente}\t${tipo}\n`);
      count++;
    }
    out.end();
    await new Promise(res => out.on('finish', res));
    console.log(`CSV generado: ${count} abonos`);

    // COPY into table
    console.log('Iniciando COPY...');
    const stream = client.query(copyFrom(`COPY ${abonosTable} (vendedor_id, fecha_abono, monto, descripcion, folio, cliente_nombre, tipo_pago) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')`));
    const fileStream = fs.createReadStream(csvPath);
    await new Promise((resolve, reject) => {
      fileStream.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', resolve);
      fileStream.pipe(stream);
    });
    fs.unlinkSync(csvPath);
    console.log('✅ Abonos importados');

    // Verificar conteo
    const check = await client.query(`SELECT COUNT(*)::int AS c, MIN(fecha_abono) AS min, MAX(fecha_abono) AS max FROM ${abonosTable}`);
    console.log('Resumen abonos =>', check.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Error import abonos:', err); process.exit(1); });
