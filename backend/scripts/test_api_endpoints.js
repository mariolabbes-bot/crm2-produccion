require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function testEndpoints() {
  try {
    console.log('--- TEST ENDPOINTS RESPONSES ---');

    // 1. VENDEDORES
    console.log('\n[API] /users/vendedores:');
    const vendorsQ = `
      SELECT DISTINCT ON (LOWER(TRIM(nombre_vendedor)))
        rut, nombre_vendedor
      FROM usuario
      WHERE LOWER(rol_usuario) = 'vendedor'
      AND nombre_vendedor IS NOT NULL
      ORDER BY LOWER(TRIM(nombre_vendedor)) ASC, rut DESC
    `;
    const vendors = await pool.query(vendorsQ);
    console.log(`Count: ${vendors.rows.length}`);
    console.table(vendors.rows.map(v => ({ rut: v.rut, nombre: v.nombre_vendedor })));

    // 2. EVOLUCIÓN MENSUAL
    console.log('\n[API] /kpis/evolucion-mensual (Mock Logic):');
    // Using the same logic as kpis.js detectedSales
    const salesTable = 'venta';
    const dateCol = 'fecha_emision';
    const amountCol = 'valor_total';

    const query = `
      SELECT 
        TO_CHAR(${dateCol}, 'YYYY-MM') AS mes,
        COALESCE(SUM(${amountCol}), 0) AS ventas
      FROM ${salesTable}
      WHERE ${dateCol} >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(${dateCol}, 'YYYY-MM')
      ORDER BY mes
    `;
    const chart = await pool.query(query);
    console.log(`Rows: ${chart.rows.length}`);
    console.table(chart.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

testEndpoints();
