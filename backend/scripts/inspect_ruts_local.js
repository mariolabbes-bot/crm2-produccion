const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectRuts() {
    try {
        console.log('--- INSPECCIÓN DE FORMATO DE RUTS ---');

        const tables = ['cliente', 'venta', 'saldo_credito'];
        
        for (const table of tables) {
            console.log(`\n[${table.toUpperCase()}]`);
            const col = table === 'venta' ? 'identificador' : 'rut';
            
            const query = `SELECT ${col} as val${table === 'saldo_credito' ? ', dv' : ''} FROM ${table} WHERE ${col} IS NOT NULL LIMIT 5`;
            const res = await pool.query(query);
            
            res.rows.forEach(r => {
                if (table === 'saldo_credito') {
                    console.log(`  RUT: "${r.val}" | DV: "${r.dv}" | Combined: "${r.val}-${r.dv}"`);
                } else {
                    console.log(`  RUT: "${r.val}"`);
                }
            });
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

inspectRuts();
