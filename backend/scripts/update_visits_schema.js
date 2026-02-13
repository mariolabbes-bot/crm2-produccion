
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function updateVisitsSchema() {
    try {
        console.log('--- UPDATING VISITAS_REGISTRO SCHEMA ---');

        const queries = [
            `ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS planificada BOOLEAN DEFAULT FALSE;`,
            `ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS prioridad_sugerida INTEGER;`,
            `ALTER TABLE visitas_registro ADD COLUMN IF NOT EXISTS distancia_checkin NUMERIC;`
        ];

        for (const query of queries) {
            await pool.query(query);
            console.log(`Executed: ${query}`);
        }

        console.log('✅ Schema updated successfully.');

    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

updateVisitsSchema();
