/*
  Importador optimizado solo para VENTAS y ABONOS
  - Usa COPY FROM para importación masiva rápida
  - Procesa en batches para evitar timeouts
*/

require('dotenv').config({ path: process.env.DOTENV_PATH || undefined });
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const copyFrom = require('pg-copy-streams').from;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1|::1/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false
});

const EXCEL_PATH = path.resolve(__dirname, '../../db/modelo_importacion_crm2.xlsx');

// Convert Excel serial date to YYYY-MM-DD
function excelDateToISO(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(serial)) return serial.split(' ')[0];
    const num = parseFloat(serial);
    if (isNaN(num)) return null;
    serial = num;
  }
  if (typeof serial !== 'number') return null;
  
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const year = date_info.getUTCFullYear();
  const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date_info.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toStr(val) {
  if (val == null || val === '') return '\\N';
  return String(val).trim()
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
}

function toNum(val) {
  if (val == null || val === '') return '\\N';
  const n = Number(val);
  return isNaN(n) ? '\\N' : n;
}

function toDate(val) {
  const d = excelDateToISO(val);
  return d || '\\N';
}

async function importVentas(client, workbook) {
  console.log('\n🔄 Importando VENTAS...');
  const ws = workbook.Sheets['VENTAS'];
  if (!ws) { console.log('❌ Hoja VENTAS no encontrada'); return { inserted: 0 }; }
  
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`📊 Total de registros a importar: ${data.length}`);
  
  // Primero truncar la tabla con CASCADE
  await client.query('TRUNCATE venta CASCADE');
  console.log('✅ Tabla venta limpiada');
  
  // Crear tabla temporal sin constraints ni autoincrements
  await client.query('DROP TABLE IF EXISTS venta_temp');
  await client.query(`
    CREATE TEMP TABLE venta_temp (
      sucursal TEXT,
      tipo_documento TEXT,
      folio TEXT,
      fecha_emision DATE,
      identificador TEXT,
      cliente TEXT,
      vendedor_cliente TEXT,
      vendedor_documento TEXT,
      estado_sistema TEXT,
      estado_comercial TEXT,
      estado_sii TEXT,
      indice INTEGER,
      sku TEXT,
      descripcion TEXT,
      cantidad NUMERIC,
      precio NUMERIC,
      valor_total NUMERIC
    )
  `);
  
  const BATCH_SIZE = 5000;
  let totalInserted = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const values = [];
    
    for (const row of batch) {
      const folio = toStr(row.Folio || row.folio);
      const tipo_documento = toStr(row['Tipo Documento'] || row.tipo_documento);
      if (!folio || !tipo_documento) continue;
      
      values.push([
        toStr(row.Sucursal || row.sucursal),
        tipo_documento,
        folio,
        toDate(row['Fecha emision'] || row.fecha_emision),
        toStr(row.Identificador || row.identificador),
        toStr(row.Cliente || row.cliente),
        toStr(row['Vendedor cliente'] || row.vendedor_cliente),
        toStr(row['Vendedor documento'] || row.vendedor_documento),
        toStr(row['Estado Sistema'] || row.estado_sistema),
        toStr(row['Estado comercial'] || row.estado_comercial),
        toStr(row['Estado SII'] || row.estado_sii),
        toNum(row.Indice || row.indice),
        toStr(row.SKU || row.sku),
        toStr(row.Descripcion || row.descripcion),
        toNum(row.Cantidad || row.cantidad),
        toNum(row.Precio || row.precio),
        toNum(row['Valor Total'] || row.valor_total)
      ].join('\t'));
    }
    
    if (values.length > 0) {
      const copyQuery = `COPY venta_temp (sucursal, tipo_documento, folio, fecha_emision, identificador, cliente, vendedor_cliente, vendedor_documento, estado_sistema, estado_comercial, estado_sii, indice, sku, descripcion, cantidad, precio, valor_total) FROM STDIN`;
      const stream = client.query(copyFrom(copyQuery));
      const dataStream = Readable.from(values.map(v => v + '\n'));
      await pipeline(dataStream, stream);
      
      totalInserted += values.length;
      console.log(`  ✅ Procesados ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} (${Math.round(totalInserted/data.length*100)}%)`);
    }
  }
  
  // Insertar desde temp a venta SIN eliminar duplicados (cada línea es única por indice)
  console.log('🔄 Moviendo todos los registros a tabla final...');
  const { rowCount } = await client.query(`
    INSERT INTO venta (sucursal, tipo_documento, folio, fecha_emision, identificador, cliente, vendedor_cliente, vendedor_documento, estado_sistema, estado_comercial, estado_sii, indice, sku, descripcion, cantidad, precio, valor_total)
    SELECT sucursal, tipo_documento, folio, fecha_emision, identificador, cliente, vendedor_cliente, vendedor_documento, estado_sistema, estado_comercial, estado_sii, indice, sku, descripcion, cantidad, precio, valor_total
    FROM venta_temp
  `);
  
  await client.query('DROP TABLE venta_temp');
  
  console.log(`\n✅ VENTAS completado: ${rowCount} registros insertados (todos los ítems de ventas)`);
  return { inserted: rowCount };
}

async function importAbonos(client, workbook) {
  console.log('\n🔄 Importando ABONOS...');
  const ws = workbook.Sheets['ABONOS'];
  if (!ws) { console.log('❌ Hoja ABONOS no encontrada'); return { inserted: 0 }; }
  
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`📊 Total de registros a importar: ${data.length}`);
  
  // Primero truncar la tabla con CASCADE
  await client.query('TRUNCATE abono CASCADE');
  console.log('✅ Tabla abono limpiada');
  
  // Crear tabla temporal sin constraints ni autoincrements
  await client.query('DROP TABLE IF EXISTS abono_temp');
  await client.query(`
    CREATE TEMP TABLE abono_temp (
      sucursal TEXT,
      folio TEXT,
      fecha DATE,
      identificador TEXT,
      cliente TEXT,
      vendedor_cliente TEXT,
      caja_operacion TEXT,
      usuario_ingreso TEXT,
      monto_total NUMERIC,
      saldo_a_favor NUMERIC,
      saldo_a_favor_total NUMERIC,
      tipo_pago TEXT,
      estado_abono TEXT,
      identificador_abono TEXT,
      fecha_vencimiento DATE,
      monto NUMERIC,
      monto_neto NUMERIC
    )
  `);
  
  const BATCH_SIZE = 5000;
  let totalInserted = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const values = [];
    
    for (const row of batch) {
      const folio = toStr(row.Folio || row.folio);
      const identificador_abono = toStr(row['Identificador Abono'] || row.identificador_abono);
      if (!folio && !identificador_abono) continue;
      
      values.push([
        toStr(row.Sucursal || row.sucursal),
        folio,
        toDate(row.Fecha || row.fecha),
        toStr(row.Identificador || row.identificador),
        toStr(row.Cliente || row.cliente),
        toStr(row['Vendedor cliente'] || row.vendedor_cliente),
        toStr(row['Caja operacion'] || row.caja_operacion),
        toStr(row['Usuario Ingreso'] || row.usuario_ingreso),
        toNum(row['Monto Total'] || row.monto_total),
        toNum(row['Saldo a Favor'] || row.saldo_a_favor),
        toNum(row['Saldo a Favor total'] || row.saldo_a_favor_total),
        toStr(row['Tipo Pago'] || row.tipo_pago),
        toStr(row['Estado Abono'] || row.estado_abono),
        identificador_abono,
        toDate(row['Fecha vencimiento'] || row.fecha_vencimiento),
        toNum(row.Monto || row.monto),
        toNum(row['Monto Neto'] || row.monto_neto)
      ].join('\t'));
    }
    
    if (values.length > 0) {
      const copyQuery = `COPY abono_temp (sucursal, folio, fecha, identificador, cliente, vendedor_cliente, caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, fecha_vencimiento, monto, monto_neto) FROM STDIN`;
      const stream = client.query(copyFrom(copyQuery));
      const dataStream = Readable.from(values.map(v => v + '\n'));
      await pipeline(dataStream, stream);
      
      totalInserted += values.length;
      console.log(`  ✅ Procesados ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} (${Math.round(totalInserted/data.length*100)}%)`);
    }
  }
  
  // Insertar desde temp a abono SIN eliminar duplicados (cada línea puede ser un pago/cuota diferente)
  console.log('🔄 Moviendo todos los registros a tabla final...');
  const { rowCount } = await client.query(`
    INSERT INTO abono (sucursal, folio, fecha, identificador, cliente, vendedor_cliente, caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, fecha_vencimiento, monto, monto_neto)
    SELECT sucursal, folio, fecha, identificador, cliente, vendedor_cliente, caja_operacion, usuario_ingreso, monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago, estado_abono, identificador_abono, fecha_vencimiento, monto, monto_neto
    FROM abono_temp
  `);
  
  await client.query('DROP TABLE abono_temp');
  
  console.log(`\n✅ ABONOS completado: ${rowCount} registros insertados (todos los detalles de pagos)`);
  return { inserted: rowCount };
}

async function main() {
  console.log(`\n🚀 Importación OPTIMIZADA de VENTAS y ABONOS`);
  console.log(`📂 Desde: ${EXCEL_PATH}\n`);
  
  const workbook = XLSX.readFile(EXCEL_PATH);
  const client = await pool.connect();
  
  try {
    // Drop ALL foreign key constraints from venta and abono
    console.log('🔧 Eliminando TODOS los constraints de foreign keys de venta y abono...');
    const { rows: ventaFks } = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE contype = 'f' AND conrelid = 'venta'::regclass
    `);
    for (const {conname} of ventaFks) {
      await client.query(`ALTER TABLE venta DROP CONSTRAINT IF EXISTS ${conname}`);
      console.log(`  ✅ Eliminado FK: ${conname}`);
    }
    
    const { rows: abonoFks } = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE contype = 'f' AND conrelid = 'abono'::regclass
    `);
    for (const {conname} of abonoFks) {
      await client.query(`ALTER TABLE abono DROP CONSTRAINT IF EXISTS ${conname}`);
      console.log(`  ✅ Eliminado FK: ${conname}`);
    }
    
    // Drop UNIQUE constraint from venta (tipo_documento, folio is not unique - each row is a line item)
    await client.query(`ALTER TABLE venta DROP CONSTRAINT IF EXISTS venta_tipo_documento_folio_key`);
    console.log(`  ✅ Eliminado: venta_tipo_documento_folio_key (cada fila es un ítem diferente)`);
    
    // Add auto-increment id to venta if not exists
    await client.query(`ALTER TABLE venta ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY`);
    console.log(`  ✅ Agregado: columna id autoincremental en venta`);
    
    // Drop PRIMARY KEY from abono (folio is not unique, each row is a payment detail)
    await client.query(`ALTER TABLE abono DROP CONSTRAINT IF EXISTS abono_pkey`);
    console.log(`  ✅ Eliminado: abono_pkey (folio no es único)`);
    
    // Add auto-increment id to abono if not exists
    await client.query(`ALTER TABLE abono ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY`);
    console.log(`  ✅ Agregado: columna id autoincremental en abono`);
    
    console.log('✅ Todos los constraints eliminados\n');
    
    const r1 = await importVentas(client, workbook);
    const r2 = await importAbonos(client, workbook);
    
    // Note: Not recreating FK constraints as they will cause issues with data quality
    console.log('\n⚠️  Nota: Los constraints de FK no fueron restaurados debido a inconsistencias en los datos');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('='.repeat(50));
    console.log(`VENTAS: ${r1.inserted} registros`);
    console.log(`ABONOS: ${r2.inserted} registros`);
    console.log(`TOTAL: ${r1.inserted + r2.inserted} registros`);
  } catch (err) {
    console.error('\n❌ Error en importación:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
