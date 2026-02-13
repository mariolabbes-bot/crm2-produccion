
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

        // 1. Get User Info (Using 'correo')
        const userRes = await pool.query('SELECT * FROM usuario WHERE correo = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found!');
            return;
        }
        const user = userRes.rows[0];
        console.log('User Found:', {
            id: user.id,
            nombre_completo: user.nombre_completo,
            nombre_vendedor: user.nombre_vendedor,
            alias: user.alias,
            correo: user.correo
        });

        // 2. Check Clients by exact name match (nombre_vendedor field in usuario vs nombre_vendedor in cliente)
        const clientsByName = await pool.query('SELECT COUNT(*) FROM cliente WHERE nombre_vendedor = $1', [user.nombre_vendedor]);
        console.log(`Clients with match on usuario.nombre_vendedor ('${user.nombre_vendedor}'): ${clientsByName.rows[0].count}`);

        // 3. Check Clients by ILIKE match on nombre_completo
        const clientsByFullName = await pool.query('SELECT COUNT(*) FROM cliente WHERE nombre_vendedor ILIKE $1', [`%${user.nombre_completo}%`]);
        console.log(`Clients with match on usuario.nombre_completo ('${user.nombre_completo}'): ${clientsByFullName.rows[0].count}`);

        // 4. Check Clients by ILIKE match on partial name (first part of nombre_completo)
        const firstName = user.nombre_completo.split(' ')[0];
        const clientsByFirstName = await pool.query('SELECT COUNT(*) FROM cliente WHERE nombre_vendedor ILIKE $1', [`%${firstName}%`]);
        console.log(`Clients with match on FirstName ('${firstName}'): ${clientsByFirstName.rows[0].count}`);

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
