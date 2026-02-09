require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const NAMES_TO_CHECK = [
    'Nelson Mu√±oz',
    'Matias Ignacio Tapia',
    'Octavio Contreras',
    'undefined'
];

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- RESOLVING RUTS FOR UNMAPPED VENDORS ---');

        // 1. Get RUTs from Saldo Credito for these names
        const res = await client.query(`
            SELECT nombre_vendedor, rut, count(*) 
            FROM saldo_credito 
            WHERE nombre_vendedor = 'Matias Ignacio Tapia'
            GROUP BY nombre_vendedor, rut
        `);

        console.table(res.rows);

        // 2. Search for potential matches in Usuario table
        console.log('\n--- POTENTIAL USER MATCHES ---');
        const searchTerms = ['Matias', 'Tapia', 'Octavio', 'Contreras'];
        const userRes = await client.query(`
            SELECT rut, nombre_vendedor, alias, nombre_credito 
            FROM usuario 
            WHERE nombre_vendedor ILIKE ANY($1)
        `, [searchTerms.map(t => `%${t}%`)]);

        console.table(userRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
