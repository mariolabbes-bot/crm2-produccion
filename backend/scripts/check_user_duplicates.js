
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkUserDuplicates() {
    try {
        console.log('--- CHECK USUARIO DUPLICATES ---');

        const res = await pool.query(`
            SELECT 
                UPPER(TRIM(nombre_vendedor)) as nombre_clean,
                COUNT(*) as count,
                ARRAY_AGG(rut) as ruts,
                ARRAY_AGG(alias) as aliases
            FROM usuario
            WHERE nombre_vendedor IS NOT NULL
            GROUP BY UPPER(TRIM(nombre_vendedor))
            HAVING COUNT(*) > 1
        `);

        console.log(`Found ${res.rows.length} duplicate names.`);
        res.rows.forEach(r => {
            console.log(`Name: '${r.nombre_clean}' | Count: ${r.count} | RUTs: ${r.ruts.join(', ')}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkUserDuplicates();
