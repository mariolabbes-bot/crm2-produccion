
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugUserClients() {
    try {
        const email = 'eduardo.rojas@lubricar-insa.cl';
        console.log(`--- DEBUGGING USER: ${email} ---`);

        // 1. Get User Info
        const userRes = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found!');
            return;
        }
        const user = userRes.rows[0];
        console.log('User Found:', { id: user.id, nombre: user.nombre, email: user.email });

        // 2. Check Clients by exact name match
        const clientsByName = await pool.query('SELECT COUNT(*) FROM cliente WHERE nombre_vendedor = $1', [user.nombre]);
        console.log(`Clients with exact name '${user.nombre}': ${clientsByName.rows[0].count}`);

        // 3. Check Clients by ILIKE name match
        const clientsByLike = await pool.query('SELECT COUNT(*) FROM cliente WHERE nombre_vendedor ILIKE $1', [`%${user.nombre}%`]);
        console.log(`Clients with ILIKE name '%${user.nombre}%': ${clientsByLike.rows[0].count}`);

        // 4. Check Clients by ID (if column exists)
        // Adjust column name if needed based on your schema knowledge
        try {
            const clientsById = await pool.query('SELECT COUNT(*) FROM cliente WHERE vendedor_id = $1', [user.id]);
            console.log(`Clients with vendedor_id ${user.id}: ${clientsById.rows[0].count}`);
        } catch (e) {
            console.log('Column vendedor_id might not exist in cliente table or mismatch type.');
        }

        // 5. List sample clients to see actual vendor names
        const sampleClients = await pool.query('SELECT DISTINCT nombre_vendedor FROM cliente LIMIT 10');
        console.log('Sample vendor names in cliente table:', sampleClients.rows.map(r => r.nombre_vendedor));

    } catch (err) {
        console.error('Error debugging:', err);
    } finally {
        await pool.end();
    }
}

debugUserClients();
