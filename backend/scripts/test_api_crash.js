require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testEndpointLogic() {
    const client = await pool.connect();
    try {
        console.log('--- TESTING ENDPOINT LOGIC SIMULATION ---');

        // Simulate the query found in routes/abonos.js
        // FROM usuario u LEFT JOIN abono a ON u.id = a.vendedor_id

        const res = await client.query(`
            SELECT u.id, u.nombre, COUNT(a.id)
            FROM usuario u
            LEFT JOIN abono a ON u.id = a.vendedor_id
            GROUP BY u.id, u.nombre
            LIMIT 5
        `);
        console.table(res.rows);

    } catch (err) {
        console.error('❌ Query Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testEndpointLogic();
