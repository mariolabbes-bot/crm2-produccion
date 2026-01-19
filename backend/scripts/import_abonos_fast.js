require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { from: copyFrom } = require('pg-copy-streams');

// Config
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const BULK_DIR = path.join(__dirname, '../bulk_data');
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
  console.log('=== IMPORT ABONOS (MULTI-FILE BULK / SCHEMA CORREGIDO) ===');

  if (!fs.existsSync(BULK_DIR)) {
    console.error('No existe directorio bulk_data:', BULK_DIR);
    process.exit(1);
  }
  const allFiles = fs.readdirSync(BULK_DIR);
  const targetFiles = allFiles.filter(f => f.toUpperCase().includes('ABONO') && !f.startsWith('PROCESSED_') && f.endsWith('.xlsx'));

  if (targetFiles.length === 0) {
    console.log('No se encontraron archivos ABONO nuevos en:', BULK_DIR);
    process.exit(0);
  }
  console.log(`Archivos a procesar: ${targetFiles.length}`, targetFiles);

  const client = await pool.connect();
  try {
    const abonosTable = 'abono';
    console.log(`Tabla destino: ${abonosTable}`);
    console.log('Limpiando tabla...');
    await client.query(`DELETE FROM ${abonosTable}`);

    // CSV Stream
    const csvPath = '/tmp/abonos_import.csv';
    const out = fs.createWriteStream(csvPath);
    let totalCount = 0;

    for (const filename of targetFiles) {
      console.log(`\n📄 Leyendo: ${filename}`);
      const filePath = path.join(BULK_DIR, filename);
      const wb = XLSX.readFile(filePath);

      let abonosSheetName = wb.SheetNames.find(n => /abonos/i.test(n));
      if (!abonosSheetName) {
        console.log(`   ℹ️ No se encontró hoja con nombre 'Abonos', usando la primera hoja: ${wb.SheetNames[0]}`);
        abonosSheetName = wb.SheetNames[0];
      }

      const sh = wb.Sheets[abonosSheetName];
      const rows = XLSX.utils.sheet_to_json(sh, { raw: true });
      console.log(`   Filas en hoja: ${rows.length}`);

      // Detectar columnas
      const headers = Object.keys(rows[0] || {});
      const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

      const colFecha = findCol([/^Fecha$/i]);
      const colFolio = findCol([/^Folio$/i]);
      const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
      const colCliente = findCol([/^Cliente$/i]);
      const colVendedor = findCol([/^Vendedor\s*cliente$/i, /^Vendedor$/i]);
      const colTipoPago = findCol([/^Tipo\s*pago$/i]);
      const colEstado = findCol([/^Estado\s*abono$/i]);
      const colMonto = findCol([/^Monto$/i]);
      const colMontoTotal = findCol([/^Monto\s*total$/i]);
      const colSucursal = findCol([/^Sucursal$/i]);

      if (!colFecha || !colCliente || !(colMonto || colMontoTotal)) {
        console.error(`   ❌ Falta col requerida en ${filename}. Fecha:${colFecha}, Cli:${colCliente}`);
        continue;
      }

      for (const r of rows) {
        const fecha = parseExcelDate(r[colFecha]);
        const monto = (r[colMonto] != null ? Number(r[colMonto]) : Number(r[colMontoTotal])) || 0;

        if (!fecha || !(monto > 0)) continue;

        const folio = r[colFolio] ? String(r[colFolio]).trim() : '';
        const identificador = colIdentificador && r[colIdentificador] ? String(r[colIdentificador]).trim() : '';
        const cliente = (r[colCliente] ? String(r[colCliente]) : '').replace(/\t|\n/g, ' ').trim();
        const vendedor = (colVendedor && r[colVendedor] ? String(r[colVendedor]) : '').replace(/\t|\n/g, ' ').trim();
        const tipo = (colTipoPago && r[colTipoPago] ? String(r[colTipoPago]) : '').replace(/\t|\n/g, ' ').trim();
        const estado = (colEstado && r[colEstado] ? String(r[colEstado]) : '').replace(/\t|\n/g, ' ').trim();
        const sucursal = (colSucursal && r[colSucursal] ? String(r[colSucursal]) : '').replace(/\t|\n/g, ' ').trim();

        // Mapeo a columnas DB: 
        // folio, fecha, identificador, cliente, vendedor_cliente, estado_abono, tipo_pago, monto, monto_total, sucursal
        // NOTA: Usamos tabulador \t como delimitador. Asegurar limpiar \t en strings.
        out.write(`${folio}\t${fecha}\t${identificador}\t${cliente}\t${vendedor}\t${estado}\t${tipo}\t${monto.toFixed(2)}\t${monto.toFixed(2)}\t${sucursal}\n`);
        totalCount++;
      }
    }

    out.end();
    await new Promise(res => out.on('finish', res));
    console.log(`\n✅ CSV acumulado generado: ${totalCount} registros.`);

    // --- COPY ---
    if (totalCount > 0) {
      console.log('Ejecutando COPY a base de datos...');
      const stream = client.query(copyFrom(`COPY ${abonosTable} (folio, fecha, identificador, cliente, vendedor_cliente, estado_abono, tipo_pago, monto, monto_total, sucursal) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')`));
      const fileStream = fs.createReadStream(csvPath);
      await new Promise((resolve, reject) => {
        fileStream.on('error', reject);
        stream.on('error', reject);
        stream.on('finish', resolve);
        fileStream.pipe(stream);
      });
      fs.unlinkSync(csvPath);
      console.log('✅ Importación Finalizada.');
    } else {
      console.log('No hay datos válidos para importar.');
    }

    // --- VERIFICACIÓN ---
    const check = await client.query(`SELECT COUNT(*)::int AS c, MIN(fecha) AS min, MAX(fecha) AS max, SUM(monto) as total_monto FROM ${abonosTable}`);
    console.log('📊 Estado Final DB:', check.rows[0]);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Error import abonos:', err); process.exit(1); });
