require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FIXES = [
    { target: 'Emilio Alberto Santos Castillo', source: 'Emilio' },
    { target: 'Milton Marin Blanco', source: 'Milton' },
    { target: 'Alejandro', source: 'Alejandro' } // Unknown, keep as is or map if known
];

async function fix() {
    const client = await pool.connect();
    try {
        console.log('--- FIXING REMAINING ABONO NAMES ---');

        for (const f of FIXES) {
            if (f.target === f.source) continue;

            const res = await client.query(`
                UPDATE abono 
                SET vendedor_cliente = $1 
                WHERE vendedor_cliente = $2
            `, [f.target, f.source]);

            if (res.rowCount > 0) {
                console.log(`Updated Abono: ${f.source} -> ${f.target} (${res.rowCount} rows)`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
