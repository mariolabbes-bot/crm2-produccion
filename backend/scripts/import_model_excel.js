/*
  Importador desde db/modelo_importacion_crm2.xlsx a la base de datos.
  - Detecta nombres de tablas (ES/EN): usuario/users, producto/products, cliente/clients, venta/sales, abono/abonos
  - Mapea nombres de columnas (ES/EN) según existan
  - Upsert seguro por clave natural (email, rut, sku, etc.) sin depender de unique constraints
  - Hash de password con bcryptjs si existe la columna correspondiente
  - Permite DRY_RUN=true para validar sin escribir
*/

require('dotenv').config({ path: process.env.DOTENV_PATH || undefined });
const path = require('path');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1|::1/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false
});

const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const EXCEL_PATH = path.resolve(__dirname, '../../db/modelo_importacion_crm2.xlsx');

// Utiles
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toStr = v => (v === null || v === undefined) ? '' : String(v).trim();
const toLower = v => toStr(v).toLowerCase();
const toNum = v => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `select to_regclass($1) as reg`,
    [table]
  );
  return !!rows[0].reg;
}

async function resolveFirstExistingTable(client, candidates) {
  for (const t of candidates) {
    if (await tableExists(client, t)) return t;
  }
  return null;
}

async function getTableColumns(client, table) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns where table_name = $1 order by ordinal_position`,
    [table.includes('.') ? table.split('.')[1] : table]
  );
  return rows.map(r => r.column_name);
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

async function importUsuarios(client, workbook) {
  const ws = workbook.Sheets['USUARIO'];
  if (!ws) { console.log('USUARIO: hoja no encontrada, se omite.'); return { inserted:0, updated:0, skipped:0 }; }
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // Resolver tabla y columnas posibles
  const table = await resolveFirstExistingTable(client, ['usuario', 'users']);
  if (!table) { console.log('USUARIO: no existe tabla usuario/users, se omite.'); return { inserted:0, updated:0, skipped:data.length } }
  const cols = await getTableColumns(client, table);

  // Mapeo de encabezados del excel
  const headerMap = {
    nombre: ['nombre','name'],
    rut: ['rut'],
    alias: ['alias','username','user'],
    telefono: ['telefono','phone'],
    email: ['email','correo'],
    password: ['password','clave'],
    rol: ['rol','role','cargo']
  };

  const resolveHeader = (row, names) => {
    for (const n of names) {
      if (n in row) return row[n];
      // Buscar case-insensitive
      const key = Object.keys(row).find(k => k.toLowerCase() === n.toLowerCase());
      if (key) return row[key];
    }
    return '';
  };

  let inserted=0, updated=0, skipped=0;
  for (const row of data) {
    const email = toLower(resolveHeader(row, headerMap.email));
    if (!email) { skipped++; continue; }

    const nombre = toStr(resolveHeader(row, headerMap.nombre));
    const rut = toStr(resolveHeader(row, headerMap.rut));
    const alias = toStr(resolveHeader(row, headerMap.alias));
    const telefono = toStr(resolveHeader(row, headerMap.telefono));
    const passwordPlain = toStr(resolveHeader(row, headerMap.password)) || '123456';
    const rol = toLower(resolveHeader(row, headerMap.rol)) || 'vendedor';
    const password = cols.includes('password') ? await bcrypt.hash(passwordPlain, 10) : null;

    // Upsert por email
  const { rows: existing } = await client.query(`select 1 from ${table} where lower(email)=lower($1) limit 1`, [email]);
    if (existing.length) {
      if (!DRY_RUN) {
        const fields = [];
        const values = [];
        let i=1;
        if (cols.includes('nombre')) { fields.push(`nombre=$${++i}`); values.push(nombre); }
        if (cols.includes('rut')) { fields.push(`rut=$${++i}`); values.push(rut); }
        if (cols.includes('alias')) { fields.push(`alias=$${++i}`); values.push(alias); }
        if (cols.includes('telefono')) { fields.push(`telefono=$${++i}`); values.push(telefono); }
        if (cols.includes('rol')) { fields.push(`rol=$${++i}`); values.push(rol); }
        if (cols.includes('password') && password) { fields.push(`password=$${++i}`); values.push(password); }
        await client.query(`update ${table} set ${fields.join(', ')} where lower(email)=lower($1)`, [email, ...values]);
      }
      updated++;
    } else {
      if (!DRY_RUN) {
        const colNames = [];
        const params = [];
        const values = [];
        let i=0;
        if (cols.includes('nombre')) { colNames.push('nombre'); params.push(`$${++i}`); values.push(nombre); }
        if (cols.includes('rut')) { colNames.push('rut'); params.push(`$${++i}`); values.push(rut); }
        if (cols.includes('alias')) { colNames.push('alias'); params.push(`$${++i}`); values.push(alias); }
        if (cols.includes('telefono')) { colNames.push('telefono'); params.push(`$${++i}`); values.push(telefono); }
        if (cols.includes('email')) { colNames.push('email'); params.push(`$${++i}`); values.push(email); }
        if (cols.includes('rol')) { colNames.push('rol'); params.push(`$${++i}`); values.push(rol); }
        if (cols.includes('password') && password) { colNames.push('password'); params.push(`$${++i}`); values.push(password); }
        await client.query(`insert into ${table} (${colNames.join(',')}) values (${params.join(',')})`, values);
      }
      inserted++;
    }
  }
  console.log(`USUARIO -> insertados: ${inserted}, actualizados: ${updated}, omitidos: ${skipped}`);
  return { inserted, updated, skipped };
}

async function importProductos(client, workbook) {
  const ws = workbook.Sheets['PRODUCTOS'];
  if (!ws) { console.log('PRODUCTOS: hoja no encontrada, se omite.'); return { inserted:0, updated:0, skipped:0 }; }
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const table = await resolveFirstExistingTable(client, ['producto','products']);
  if (!table) { console.log('PRODUCTOS: no existe tabla producto/products, se omite.'); return { inserted:0, updated:0, skipped:data.length } }
  const cols = await getTableColumns(client, table);

  let ins=0, upd=0, skip=0;
  for (const row of data) {
    const sku = toStr(row.SKU || row.sku);
    if (!sku) { skip++; continue; }
    const descripcion = toStr(row.Descripcion || row.descripcion);
    const familia = toStr(row.Familia || row.familia);
    const subfamilia = toStr(row.SubFamilia || row.subfamilia);
    const marca = toStr(row.Marca || row.marca);

    const { rows: ex } = await client.query(`select 1 from ${table} where sku=$1 limit 1`, [sku]);
    if (ex.length) {
      if (!DRY_RUN) {
        const parts=[], vals=[sku]; let i=1;
        if (cols.includes('descripcion')) { parts.push(`descripcion=$${++i}`); vals.push(descripcion); }
        if (cols.includes('familia')) { parts.push(`familia=$${++i}`); vals.push(familia); }
        if (cols.includes('subfamilia')) { parts.push(`subfamilia=$${++i}`); vals.push(subfamilia); }
        if (cols.includes('marca')) { parts.push(`marca=$${++i}`); vals.push(marca); }
        await client.query(`update ${table} set ${parts.join(', ')} where sku=$1`, vals);
      }
      upd++;
    } else {
      if (!DRY_RUN) {
        const colsIns=['sku'], params=['$1'], vals=[sku]; let i=1;
        if (cols.includes('descripcion')) { colsIns.push('descripcion'); params.push(`$${++i}`); vals.push(descripcion); }
        if (cols.includes('familia')) { colsIns.push('familia'); params.push(`$${++i}`); vals.push(familia); }
        if (cols.includes('subfamilia')) { colsIns.push('subfamilia'); params.push(`$${++i}`); vals.push(subfamilia); }
        if (cols.includes('marca')) { colsIns.push('marca'); params.push(`$${++i}`); vals.push(marca); }
        await client.query(`insert into ${table} (${colsIns.join(',')}) values (${params.join(',')})`, vals);
      }
      ins++;
    }
  }
  console.log(`PRODUCTOS -> insertados: ${ins}, actualizados: ${upd}, omitidos: ${skip}`);
  return { inserted: ins, updated: upd, skipped: skip };
}

async function importClientes(client, workbook) {
  const ws = workbook.Sheets['CLIENTES'];
  if (!ws) { console.log('CLIENTES: hoja no encontrada, se omite.'); return { inserted:0, updated:0, skipped:0 }; }
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const table = await resolveFirstExistingTable(client, ['cliente','clients']);
  const usersTable = await resolveFirstExistingTable(client, ['usuario','users']);
  let usersHasId = false;
  if (usersTable) {
    const colz = await getTableColumns(client, usersTable);
    usersHasId = colz.includes('id');
  }
  if (!table) { console.log('CLIENTES: no existe tabla cliente/clients, se omite.'); return { inserted:0, updated:0, skipped:data.length } }
  const cols = await getTableColumns(client, table);

  let ins=0, upd=0, skip=0;
  for (const row of data) {
    const rut = toStr(row.RUT || row.rut || row.Identificador);
    if (!rut) { skip++; continue; }
    const nombre = toStr(row.Nombre || row.nombre);
    const email = toStr(row.Email || row.email);
    const telefono = toStr(row.Telefono || row.telefono);
    const sucursal = toStr(row.Sucursal || row.sucursal);
    const comuna = toStr(row.Comuna || row.comuna);
    const ciudad = toStr(row.Ciudad || row.ciudad);
    const direccion = toStr(row.Direccion || row.direccion);
    const vendedorNombre = toStr(row.Vendedor || row['Vendedor cliente'] || row.vendedor);

    let vendedor_id = null;
    if (usersTable && usersHasId && vendedorNombre) {
      const { rows: v } = await client.query(`select id from ${usersTable} where lower(nombre)=lower($1) limit 1`, [vendedorNombre]);
      vendedor_id = v[0]?.id || null;
    }

    const { rows: ex } = await client.query(`select 1 from ${table} where rut=$1 limit 1`, [rut]);
    if (ex.length) {
      if (!DRY_RUN) {
        const parts=[], vals=[rut]; let i=1;
        if (cols.includes('nombre')) { parts.push(`nombre=$${++i}`); vals.push(nombre); }
        if (cols.includes('email')) { parts.push(`email=$${++i}`); vals.push(email); }
        if (cols.includes('telefono')) { parts.push(`telefono=$${++i}`); vals.push(telefono); }
        if (cols.includes('sucursal')) { parts.push(`sucursal=$${++i}`); vals.push(sucursal); }
        if (cols.includes('comuna')) { parts.push(`comuna=$${++i}`); vals.push(comuna); }
        if (cols.includes('ciudad')) { parts.push(`ciudad=$${++i}`); vals.push(ciudad); }
        if (cols.includes('direccion')) { parts.push(`direccion=$${++i}`); vals.push(direccion); }
  if (cols.includes('vendedor_id')) { parts.push(`vendedor_id=$${++i}`); vals.push(vendedor_id); }
        await client.query(`update ${table} set ${parts.join(', ')} where rut=$1`, vals);
      }
      upd++;
    } else {
      if (!DRY_RUN) {
        const colsIns=['rut'], params=['$1'], vals=[rut]; let i=1;
        if (cols.includes('nombre')) { colsIns.push('nombre'); params.push(`$${++i}`); vals.push(nombre); }
        if (cols.includes('email')) { colsIns.push('email'); params.push(`$${++i}`); vals.push(email); }
        if (cols.includes('telefono')) { colsIns.push('telefono'); params.push(`$${++i}`); vals.push(telefono); }
        if (cols.includes('sucursal')) { colsIns.push('sucursal'); params.push(`$${++i}`); vals.push(sucursal); }
        if (cols.includes('comuna')) { colsIns.push('comuna'); params.push(`$${++i}`); vals.push(comuna); }
        if (cols.includes('ciudad')) { colsIns.push('ciudad'); params.push(`$${++i}`); vals.push(ciudad); }
        if (cols.includes('direccion')) { colsIns.push('direccion'); params.push(`$${++i}`); vals.push(direccion); }
  if (cols.includes('vendedor_id')) { colsIns.push('vendedor_id'); params.push(`$${++i}`); vals.push(vendedor_id); }
        await client.query(`insert into ${table} (${colsIns.join(',')}) values (${params.join(',')})`, vals);
      }
      ins++;
    }
  }
  console.log(`CLIENTES -> insertados: ${ins}, actualizados: ${upd}, omitidos: ${skip}`);
  return { inserted: ins, updated: upd, skipped: skip };
}

async function importSignacionLitros(client, workbook) {
  const ws = workbook.Sheets['SIGNACION LITROS'];
  if (!ws) { console.log('SIGNACION LITROS: hoja no encontrada, se omite.'); return { updated:0, skipped:0 } }
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const table = await resolveFirstExistingTable(client, ['producto','products']);
  if (!table) { console.log('SIGNACION LITROS: no existe tabla producto/products, se omite.'); return { updated:0, skipped:data.length } }
  const cols = await getTableColumns(client, table);
  if (!cols.includes('litros_por_unidad') && !cols.includes('litros_x_unidad') && !cols.includes('litros_x_unidad_de_venta')) {
    console.log('SIGNACION LITROS: la tabla de productos no tiene columna de litros, se omite.');
    return { updated:0, skipped:data.length };
  }
  const litrosCol = cols.includes('litros_por_unidad') ? 'litros_por_unidad' : (cols.includes('litros_x_unidad') ? 'litros_x_unidad' : 'litros_x_unidad_de_venta');

  let upd=0, skip=0;
  for (const row of data) {
    const descripcion = toStr(row.descripcion || row.Descripcion);
    const litros = toNum(row['litros x unidad de venta'] || row.litros || row['Litros']);
    if (!descripcion || litros==null) { skip++; continue; }
    if (!DRY_RUN) {
      await client.query(`update ${table} set ${litrosCol}=$2 where lower(descripcion)=lower($1)`, [descripcion, litros]);
    }
    upd++;
  }
  console.log(`SIGNACION LITROS -> actualizados: ${upd}, omitidos: ${skip}`);
  return { updated: upd, skipped: skip };
}

async function main() {
  console.log(`\n🚀 Importación desde: ${EXCEL_PATH}`);
  if (DRY_RUN) console.log('🔎 Modo DRY_RUN=TRUE (no se escribirá en la base)');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r1 = await importUsuarios(client, workbook);
    const r2 = await importProductos(client, workbook);
    const r3 = await importClientes(client, workbook);
    const r4 = await importSignacionLitros(client, workbook);
    
    if (DRY_RUN) {
      await client.query('ROLLBACK');
      console.log('\nℹ️ DRY_RUN completado. No se realizaron cambios.');
    } else {
      await client.query('COMMIT');
      console.log('\n✅ Importación confirmada.');
    }
    console.log('\nResumen:');
    console.log({ usuarios: r1, productos: r2, clientes: r3, signacion_litros: r4 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en importación:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
