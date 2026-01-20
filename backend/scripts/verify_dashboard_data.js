require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    try {
        console.log('--- VERIFICACIÓN DE DATOS DASHBOARD ---');

        // 1. Verificar Ventas Mensuales (para KPI Promedio)
        console.log('\n1. VENTAS MENSUALES (Oct 2025 - Ene 2026):');
        const ventasQuery = `
      SELECT 
        DATE_TRUNC('month', fecha_emision) as mes,
        COUNT(*) as cantidad,
        SUM(valor_total) as total_neto
      FROM venta
      WHERE fecha_emision >= '2025-10-01' AND fecha_emision < '2026-02-01'
      GROUP BY 1
      ORDER BY 1;
    `;
        const ventas = await pool.query(ventasQuery);
        console.table(ventas.rows.map(r => ({
            mes: r.mes.toISOString().substring(0, 7),
            cantidad: r.cantidad,
            total_neto: Math.round(r.total_neto)
        })));

        // 2. Verificar Vendedores Duplicados
        console.log('\n2. VENDEDORES (Raw vs Distinct):');
        const rawVendedores = await pool.query(`
      SELECT nombre_vendedor, COUNT(*) 
      FROM usuario 
      WHERE LOWER(rol_usuario) = 'vendedor' 
      GROUP BY 1 
      ORDER BY 1
    `);

        console.log('--- Lista Completa de Vendedores (Agrupada por nombre exacto) ---');
        rawVendedores.rows.forEach(r => {
            console.log(`"${r.nombre_vendedor}": ${r.count}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkData();
