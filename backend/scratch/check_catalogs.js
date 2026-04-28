
const pool = require('../src/db');

async function checkCatalogs() {
    try {
        const activities = await pool.query('SELECT * FROM activity_types ORDER BY id');
        const goals = await pool.query('SELECT * FROM goal_types ORDER BY id');

        console.log('--- ACTIVITY TYPES ---');
        activities.rows.forEach(r => console.log(`[${r.id}] ${r.nombre}`));

        console.log('\n--- GOAL TYPES ---');
        goals.rows.forEach(r => console.log(`[${r.id}] ${r.nombre}`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkCatalogs();
