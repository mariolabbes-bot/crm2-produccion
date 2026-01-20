require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        console.log('--- VERIFICACIÓN POST-IMPORTACIÓN CLIENTES ---');

        // 1. TOTAL COUNT
        const totalRes = await pool.query('SELECT COUNT(*) FROM cliente');
        console.log(`\nTotal Clientes: ${totalRes.rows[0].count}`);

        // 2. VENDOR STATS
        console.log('\n--- DISTRIBUCIÓN POR VENDEDOR ---');
        const vendorStats = await pool.query(`
            SELECT nombre_vendedor, COUNT(*) as cantidad
            FROM cliente
            GROUP BY nombre_vendedor
            ORDER BY cantidad DESC
         `);
        console.table(vendorStats.rows);

        // 3. CHECK NULLS
        const nulls = vendorStats.rows.find(r => r.nombre_vendedor === null);
        if (nulls) {
            console.warn(`⚠️ ATENCIÓN: Aún existen ${nulls.cantidad} clientes con vendedor NULL.`);
        } else {
            console.log('✅ EXCELENTE: No hay clientes con vendedor NULL.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verify();
