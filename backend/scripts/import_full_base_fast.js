require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const fs = require('fs');
const { from: copyFrom } = require('pg-copy-streams');
const path = require('path');
const fixedMapPath = path.join(__dirname, '..', 'config', 'vendor_alias_map.json');
let FIXED_ALIAS = {};
try { FIXED_ALIAS = require(fixedMapPath); } catch (_) { FIXED_ALIAS = {}; }

// Configuración
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';
const MAPPING_FILE = process.env.MAPPING_FILE || '/Users/mariolabbe/Desktop/base vendedores.xlsx';

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

function norm(s) {
  return (s == null ? '' : String(s))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/\s+/g, ' ') // espacios múltiples
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

async function importData() {
  console.log('=== INICIO DE IMPORTACIÓN RÁPIDA ===');
  console.log('Leyendo Excel...');

  const workbook = XLSX.readFile(EXCEL_PATH);
  // Log hojas disponibles (ayuda a depurar nombres)
  console.log('Hojas disponibles:', workbook.SheetNames.join(', '));
  const sheetName = workbook.SheetNames.includes('VENTAS 2024-2025') ? 'VENTAS 2024-2025' : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

  console.log(`Total filas en Excel: ${data.length}`);

  const headers = Object.keys(data[0] || {});
  const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
  const colFolio = findCol([/^Folio$/i]);
  const colIdentificador = findCol([/^Identificador$/i]);
  const colFecha = findCol([/Fecha/i]);
  const colCliente = findCol([/^Cliente$/i]);
  const colVendedorDoc = findCol([/^Vendedor documento$/i, /^Vendedor cliente$/i, /^Vendedor$/i]);
  const colCantidad = findCol([/^Cantidad$/i]);
  const colPrecio = findCol([/^Precio( Unitario)?$/i]);

  console.log('Columnas detectadas:', { colFolio, colIdentificador, colFecha, colCliente, colVendedorDoc, colCantidad, colPrecio });
  if (!colFolio || !colIdentificador || !colFecha || !colCliente || !colCantidad || !colPrecio) {
    throw new Error('No se encontraron columnas requeridas (folio/identificador/fecha/cliente/cantidad/precio)');
  }

  const client = await pool.connect();
  try {
    // Usuarios
  const usersRes = await client.query("SELECT id, nombre, rol FROM users WHERE rol IN ('vendedor','manager')");
  const usersByNormName = new Map(usersRes.rows.map(u => [norm(u.nombre), u.id]));
  const userRecords = usersRes.rows.map(u => ({ id: u.id, nombre: u.nombre, norm: norm(u.nombre), tokens: norm(u.nombre).split(' ') }));
    const managerId = usersRes.rows.find(u => u.rol === 'manager')?.id || null;

  // Mapeo de alias -> usuario (opcional, hoja 'MAPEO VENDEDORES' o archivo externo)
  const aliasMap = new Map(); // alias normalizado -> userId
    // Detectar hoja de mapeo por nombre normalizado (ignora mayúsculas/acentos/espacios)
    const internalMapSheetName = workbook.SheetNames.find(n => norm(n) === norm('MAPEO VENDEDORES'));
    if (internalMapSheetName && workbook.Sheets[internalMapSheetName]) {
      const mapRows = XLSX.utils.sheet_to_json(workbook.Sheets[internalMapSheetName], { raw: true });
      const hdrs = Object.keys(mapRows[0] || {});
      const colAlias = hdrs.find(h => /alias/i.test(h));
      const colUsuario = hdrs.find(h => /usuario|user/i.test(h));
      if (colAlias && colUsuario) {
        for (const r of mapRows) {
          const alias = norm(r[colAlias]);
          const usuario = norm(r[colUsuario]);
          const uid = usersByNormName.get(usuario);
          if (alias && uid) aliasMap.set(alias, uid);
        }
        console.log(`Mapeo de vendedores (hoja interna: ${internalMapSheetName}) cargado: ${aliasMap.size} alias`);
      } else {
        console.log(`Hoja ${internalMapSheetName} encontrada pero no se detectaron columnas alias/usuario. Encabezados: ${hdrs.join(', ')}`);
      }
    } else {
      console.log('No hay hoja de mapeo (MAPEO VENDEDORES) detectada; se usará coincidencia por nombre');
    }

    // Overrides fijos desde config JSON
    Object.entries(FIXED_ALIAS).forEach(([alias, targetName]) => {
      const u = usersRes.rows.find(u => norm(u.nombre) === norm(targetName));
      if (u) aliasMap.set(norm(alias), u.id);
    });

    // Mapeo externo desde archivo (si existe)
    try {
      if (fs.existsSync(MAPPING_FILE)) {
        const wbMap = XLSX.readFile(MAPPING_FILE);
        const mapSheet = wbMap.Sheets[wbMap.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(mapSheet, { raw: true });
        const hdrs = Object.keys(rows[0] || {});
        const colAlias = hdrs.find(h => /alias/i.test(h));
        const colUsuario = hdrs.find(h => /usuario|user/i.test(h));
        const colNombreVendedor = hdrs.find(h => /nombre\s*vendedor/i.test(h));
        const colNombre = hdrs.find(h => /^\s*nombre\s*$/i.test(h));
        const colApellido = hdrs.find(h => /apellido(?!.*\d)/i.test(h));
        const colApellido2 = hdrs.find(h => /apellido\s*2/i.test(h));
        let added = 0;
        if (colAlias && colUsuario) {
          for (const r of rows) {
            const alias = norm(r[colAlias]);
            const usuario = norm(r[colUsuario]);
            const uid = usersByNormName.get(usuario);
            if (alias && uid) {
              if (!aliasMap.has(alias)) added++;
              aliasMap.set(alias, uid);
            }
          }
          console.log(`Mapeo externo cargado desde ${MAPPING_FILE}: +${added} alias (total ${aliasMap.size})`);
        } else if (colNombreVendedor && colNombre && colApellido) {
          // Construir usuario por nombre completo y mapear desde 'NOMBRE VENDEDOR'
          for (const r of rows) {
            const alias = norm(r[colNombreVendedor]);
            const full = [r[colNombre], r[colApellido], r[colApellido2] || '']
              .map(x => (x == null ? '' : String(x)))
              .join(' ');
            const usuario = norm(full);
            const uid = usersByNormName.get(usuario);
            if (alias && uid) {
              if (!aliasMap.has(alias)) added++;
              aliasMap.set(alias, uid);
            }
          }
          console.log(`Mapeo externo (por nombre completo) cargado desde ${MAPPING_FILE}: +${added} alias (total ${aliasMap.size})`);
        } else {
          console.log(`Archivo de mapeo encontrado pero sin columnas reconocidas. Encabezados: ${hdrs.join(', ')}`);
        }
      } else {
        console.log(`No se encontró archivo de mapeo externo en ${MAPPING_FILE}`);
      }
    } catch (e) {
      console.log('Advertencia: no se pudo leer el archivo de mapeo externo:', e.message);
    }

    // Agrupar facturas
    const facturas = new Map();
    const unmatched = new Map(); // alias no mapeados -> conteo
    for (const row of data) {
      const key = `${row[colIdentificador]}-${row[colFolio]}`;
      if (!facturas.has(key)) {
        const vendedorNombre = row[colVendedorDoc] || '';
        const alias = norm(vendedorNombre);
        let vendedor_id = null;
        if (aliasMap.has(alias)) {
          vendedor_id = aliasMap.get(alias);
        } else if (usersByNormName.has(alias)) {
          vendedor_id = usersByNormName.get(alias);
        } else {
          // Heurística: si el alias coincide con un token del nombre del usuario (p.ej. 'omar' -> 'OMAR MALDONADO')
          const aliasTokens = alias.split(' ').filter(Boolean);
          const candidates = userRecords.filter(u => aliasTokens.every(t => u.tokens.includes(t)));
          if (candidates.length === 1) {
            vendedor_id = candidates[0].id;
          } else {
            // Heurística 2: primer token igual
            const cand2 = userRecords.filter(u => u.tokens[0] === aliasTokens[0]);
            if (cand2.length === 1) {
              vendedor_id = cand2[0].id;
            } else {
              vendedor_id = managerId || null;
              if (alias) unmatched.set(alias, (unmatched.get(alias) || 0) + 1);
            }
          }
        }

        facturas.set(key, {
          vendedor_id,
          fecha_emision: parseExcelDate(row[colFecha]),
          cliente_nombre: (row[colCliente] || 'Cliente desconocido').toString().trim(),
          total_neto: 0
        });
      }
      const precio = parseFloat(row[colPrecio]) || 0;
      const cantidad = parseFloat(row[colCantidad]) || 0;
      const descuento = parseFloat(row['% Descuento'] || 0) || 0;
      const subtotal = precio * cantidad;
      const neto = subtotal - subtotal * (descuento / 100);
      facturas.get(key).total_neto += neto;
    }

    console.log(`Facturas únicas: ${facturas.size}`);
    if (unmatched.size > 0) {
      const top = [...unmatched.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
      console.log(`Aviso: ${unmatched.size} alias de vendedor no mapeados. Ejemplos:`, top);
    }

    // Limpiar tabla
    console.log('Limpiando tabla sales...');
    await client.query('DELETE FROM sales');

    // CSV temporal
    const csvPath = '/tmp/sales_import.csv';
    const csvStream = fs.createWriteStream(csvPath);
    let count = 0;
    for (const [, f] of facturas) {
      const total_venta = f.total_neto * 1.19;
      if (f.fecha_emision) {
        const clienteSan = f.cliente_nombre.replace(/\t/g, ' ').replace(/\n/g, ' ').trim();
        csvStream.write(`${f.vendedor_id || ''}\t${f.fecha_emision}\t${total_venta.toFixed(2)}\t${clienteSan}\n`);
        count++;
      }
    }
    csvStream.end();
    await new Promise(res => csvStream.on('finish', res));
    console.log(`Archivo CSV generado con ${count} registros`);

    // COPY
    console.log('Iniciando COPY masivo...');
    const start = Date.now();
    const stream = client.query(copyFrom("COPY sales (vendedor_id, fecha_emision, total_venta, cliente_nombre) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')"));
    const fileStream = fs.createReadStream(csvPath);
    await new Promise((resolve, reject) => {
      fileStream.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', resolve);
      fileStream.pipe(stream);
    });
    const sec = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ IMPORTACIÓN COMPLETADA en ${sec} segundos`);

    const cnt = await client.query('SELECT COUNT(*) FROM sales');
    console.log(`Total registros en BD: ${cnt.rows[0].count}`);

    fs.unlinkSync(csvPath);
  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch(err => {
  console.error('Error en importación:', err);
  process.exit(1);
});
