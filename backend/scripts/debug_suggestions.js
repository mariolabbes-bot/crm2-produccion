
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugSuggestionsQuery() {
    try {
        const email = 'eduardo.rojas@lubricar-insa.cl';
        console.log(`--- DEBUGGING SUGGESTIONS QUERY FOR USER: ${email} ---`);

        // 1. Get User
        const userRes = await pool.query('SELECT id, nombre_vendedor FROM usuario WHERE correo = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const user = userRes.rows[0];
        console.log('User:', user);

        const nombreVendedor = user.nombre_vendedor;
        console.log('Nombre Vendedor for Query:', nombreVendedor);

        // 2. Run EXACT Query from visits.js
        const suggestionsQuery = `
            SELECT c.rut, c.nombre
            FROM cliente c
            WHERE c.nombre_vendedor ILIKE $1
            AND NOT EXISTS (
                SELECT 1 FROM visitas_registro vr 
                WHERE vr.cliente_rut = c.rut AND vr.fecha = CURRENT_DATE
            )
            LIMIT 5
        `;

        const params = [`%${nombreVendedor}%`];
        console.log('Query Params:', params);

        const result = await pool.query(suggestionsQuery, params);
        console.log(`Query Result Rows: ${result.rows.length}`);
        if (result.rows.length > 0) {
            console.log('Sample Row:', result.rows[0]);
        } else {
            // 3. Fallback check: Why 0?
            console.log('--- DIAGNOSTIC ---');
            const basicCount = await pool.query('SELECT COUNT(*) FROM cliente WHERE nombre_vendedor ILIKE $1', params);
            console.log(`Total clients matching ILIKE: ${basicCount.rows[0].count}`);

            const visitsCount = await pool.query(`
                SELECT COUNT(*) FROM visitas_registro vr 
                JOIN cliente c ON vr.cliente_rut = c.rut
                WHERE c.nombre_vendedor ILIKE $1 AND vr.fecha = CURRENT_DATE
             `, params);
            console.log(`Visits today for this vendor: ${visitsCount.rows[0].count}`);
        }

    } catch (err) {
        console.error('Error debugging:', err);
    } finally {
        await pool.end();
    }
}

debugSuggestionsQuery();
