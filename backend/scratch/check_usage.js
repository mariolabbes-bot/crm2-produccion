
const pool = require('../src/db');

async function checkUsage() {
    try {
        const usageA = await pool.query('SELECT activity_type_id, count(*) FROM visitas_registro GROUP BY activity_type_id');
        console.log('--- USAGE OF ACTIVITY TYPES ---');
        usageA.rows.forEach(r => console.log(`ID ${r.activity_type_id}: ${r.count} records`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkUsage();
