require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnose() {
  try {
    console.log('🔍 Diagnosticando datos para KPIs...\n');

    // 1. Verificar tablas existentes
    console.log('📋 Tablas disponibles:');
    const tablesQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    tablesQuery.rows.forEach(r => console.log(`  - ${r.table_name}`));

    // 2. Detectar tabla de ventas
    const salesTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sales', 'ventas', 'venta')
      LIMIT 1
    `);
    
    if (salesTableCheck.rows.length === 0) {
      console.log('\n❌ No se encontró tabla de ventas (sales/ventas/venta)');
      process.exit(1);
    }

    const salesTable = salesTableCheck.rows[0].table_name;
    console.log(`\n✅ Tabla de ventas encontrada: ${salesTable}`);

    // 3. Detectar columnas
    const colsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [salesTable]);
    
    console.log(`\n📊 Columnas en ${salesTable}:`);
    colsQuery.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    // Detectar columna de fecha
    let dateCol = null;
    if (colsQuery.rows.some(r => r.column_name === 'fecha_emision')) dateCol = 'fecha_emision';
    else if (colsQuery.rows.some(r => r.column_name === 'fecha')) dateCol = 'fecha';
    else if (colsQuery.rows.some(r => r.column_name === 'date')) dateCol = 'date';

    if (!dateCol) {
      console.log('\n❌ No se encontró columna de fecha');
      process.exit(1);
    }

    // Detectar columna de monto
    let amountCol = null;
    if (colsQuery.rows.some(r => r.column_name === 'valor_total')) amountCol = 'valor_total';
    else if (colsQuery.rows.some(r => r.column_name === 'total')) amountCol = 'total';
    else if (colsQuery.rows.some(r => r.column_name === 'monto')) amountCol = 'monto';

    if (!amountCol) {
      console.log('\n❌ No se encontró columna de monto');
      process.exit(1);
    }

    console.log(`\n✅ Columna fecha: ${dateCol}`);
    console.log(`✅ Columna monto: ${amountCol}`);

    // 4. Contar registros totales
    const countQuery = await pool.query(`SELECT COUNT(*) as total FROM ${salesTable}`);
    console.log(`\n📈 Total de registros en ${salesTable}: ${countQuery.rows[0].total}`);

    // 5. Ver último mes con datos
    const lastMonthQuery = await pool.query(`
      SELECT TO_CHAR(MAX(${dateCol}), 'YYYY-MM') as ultimo_mes,
             COUNT(*) as registros,
             SUM(${amountCol}) as monto_total
      FROM ${salesTable}
    `);
    console.log(`\n📅 Último mes con datos: ${lastMonthQuery.rows[0].ultimo_mes}`);
    console.log(`   Registros: ${lastMonthQuery.rows[0].registros}`);
    console.log(`   Monto total: $${parseFloat(lastMonthQuery.rows[0].monto_total || 0).toLocaleString('es-CL')}`);

    // 6. Ver distribución por mes (últimos 6 meses)
    const monthsQuery = await pool.query(`
      SELECT 
        TO_CHAR(${dateCol}, 'YYYY-MM') as mes,
        COUNT(*) as registros,
        SUM(${amountCol}) as monto_total
      FROM ${salesTable}
      WHERE ${dateCol} >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(${dateCol}, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 6
    `);

    console.log(`\n📊 Distribución últimos 6 meses:`);
    monthsQuery.rows.forEach(r => {
      console.log(`  ${r.mes}: ${r.registros} ventas - $${parseFloat(r.monto_total).toLocaleString('es-CL')}`);
    });

    // 7. Verificar tabla abono
    const abonoCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abono') as has_abono
    `);

    if (abonoCheck.rows[0].has_abono) {
      console.log(`\n✅ Tabla 'abono' existe`);
      
      const abonoCountQuery = await pool.query(`SELECT COUNT(*) as total FROM abono`);
      console.log(`   Total abonos: ${abonoCountQuery.rows[0].total}`);

      const abonoLastMonthQuery = await pool.query(`
        SELECT TO_CHAR(MAX(fecha_abono), 'YYYY-MM') as ultimo_mes,
               COUNT(*) as registros,
               SUM(monto) as monto_total
        FROM abono
      `);
      console.log(`   Último mes: ${abonoLastMonthQuery.rows[0].ultimo_mes}`);
      console.log(`   Monto total: $${parseFloat(abonoLastMonthQuery.rows[0].monto_total || 0).toLocaleString('es-CL')}`);
    } else {
      console.log(`\n❌ Tabla 'abono' NO existe`);
    }

    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

diagnose();
