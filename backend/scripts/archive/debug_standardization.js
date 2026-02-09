require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    const client = await pool.connect();
    try {
        console.log('--- DEBUG STANDARDIZATION ---');

        // 1. Check what's in the DB for 2026
        const res2026 = await client.query(`
            SELECT vendedor_cliente, COUNT(*) 
            FROM venta 
            WHERE EXTRACT(YEAR FROM fecha_emision) = 2026 
            GROUP BY vendedor_cliente 
            LIMIT 5
        `);
        console.log('\n[DB 2026 Sample]');
        console.table(res2026.rows);

        // 2. Check the Mapping Logic
        const userRes = await client.query("SELECT alias, nombre_vendedor FROM usuario");
        const aliasMap = new Map();
        userRes.rows.forEach(u => {
            const fullName = u.nombre_vendedor;
            // logic mirrored from script
            if (u.alias) aliasMap.set(u.alias.toLowerCase().trim(), fullName);
            if (u.nombre_vendedor) aliasMap.set(u.nombre_vendedor.toLowerCase().trim(), fullName);
        });

        console.log(`\n[Alias Map Size]: ${aliasMap.size}`);
        console.log(`Map has 'omar'? ${aliasMap.has('omar')} -> ${aliasMap.get('omar')}`);
        console.log(`Map has 'alex'? ${aliasMap.has('alex')} -> ${aliasMap.get('alex')}`);
        console.log(`Map has 'eduardo'? ${aliasMap.has('eduardo')} -> ${aliasMap.get('eduardo')}`);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

debug();
