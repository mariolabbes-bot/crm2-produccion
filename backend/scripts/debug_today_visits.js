
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugTodayVisits() {
    try {
        const email = 'eduardo.rojas@lubricar-insa.cl';
        console.log(`--- CHECKING VISITS FOR: ${email} ---`);

        // 1. Get User
        const userRes = await pool.query('SELECT id, nombre_vendedor FROM usuario WHERE correo = $1', [email]);
        if (userRes.rows.length === 0) { console.log('User not found'); return; }
        const user = userRes.rows[0];

        // 2. Count visits today
        const query = `
            SELECT COUNT(*) FROM visitas_registro 
            WHERE seller_id = $1 AND fecha = CURRENT_DATE
        `;
        // WAIT, schema might be vendedor_id. Let's check schema/previous usage.
        // In visits.js it uses: WHERE vendedor_id = $1

        const text = 'SELECT COUNT(*) FROM visitas_registro WHERE vendedor_id = $1 AND fecha = CURRENT_DATE';
        const res = await pool.query(text, [user.id]);
        console.log(`Visits found for today (vendedor_id=${user.id}): ${res.rows[0].count}`);

        // 3. List them
        if (parseInt(res.rows[0].count) > 0) {
            const list = await pool.query('SELECT * FROM visitas_registro WHERE vendedor_id = $1 AND fecha = CURRENT_DATE', [user.id]);
            console.log('Sample Visits:', list.rows.slice(0, 3));
        }

    } catch (err) {
        console.error('Error debugging:', err);
    } finally {
        await pool.end();
    }
}

debugTodayVisits();
