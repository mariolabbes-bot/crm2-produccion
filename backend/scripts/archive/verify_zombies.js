require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyZombies() {
    try {
        console.log('--- VERIFICANDO ZOMBIES (_OLD) ---');
        const res = await pool.query(`
        SELECT rut, nombre_vendedor, alias 
        FROM usuario 
        WHERE alias LIKE '%_OLD'
    `);

        for (const u of res.rows) {
            // Check Sales
            const sales = await pool.query('SELECT COUNT(*) FROM venta WHERE vendedor_documento = $1', [u.alias]);
            // Check Abonos
            // const abono = await pool.query('SELECT COUNT(*) FROM abono WHERE vendedor_documento = $1', [u.alias]);
            // Check Abono string? 
            // Abono usually has vendedor_cliente (string).

            console.log(`Zombie: ${u.nombre_vendedor} (${u.alias}) -> Ventas: ${sales.rows[0].count} | Abonos: ?`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyZombies();
