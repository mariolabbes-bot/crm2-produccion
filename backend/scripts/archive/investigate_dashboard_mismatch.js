require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function investigate() {
    const client = await pool.connect();
    try {
        console.log('--- DATA MISMATCH INVESTIGATION ---');


        // 1. Check Saldo Credito (Already Works, checking consistency)
        const scRes = await client.query('SELECT nombre_vendedor, COUNT(*) FROM saldo_credito GROUP BY nombre_vendedor ORDER BY count(*) DESC LIMIT 5');
        console.log('\n[SALDO CREDITO] (Baseline - Full Names):');
        console.table(scRes.rows);

        // 2. Check Venta (Should now be Full Names)
        const ventaRes = await client.query('SELECT vendedor_cliente, COUNT(*) FROM venta GROUP BY vendedor_cliente ORDER BY count(*) DESC LIMIT 5');
        console.log('\n[VENTA] (Should match Full Names):');
        console.table(ventaRes.rows);

        // 3. Check Abono (Should now be Full Names)
        const abonoRes = await client.query('SELECT vendedor_cliente, COUNT(*) FROM abono GROUP BY vendedor_cliente ORDER BY count(*) DESC LIMIT 5');
        console.log('\n[ABONO] (Should match Full Names):');
        console.table(abonoRes.rows);

        // 4. Check Usuario Mapping
        const userRes = await client.query('SELECT nombre_vendedor, alias FROM usuario WHERE alias IS NOT NULL LIMIT 10');
        console.log('\n[USUARIO] Mapping:');
        console.table(userRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

investigate();
