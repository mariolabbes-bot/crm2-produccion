require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- MIGRATION: STANDARDIZE VENDOR NAMES (ALIAS -> FULL NAME) ---');

        // 1. Fetch Mapping
        console.log('Fetching user mapping...');
        const userRes = await client.query(`
            SELECT nombre_vendedor, alias 
            FROM usuario 
            WHERE alias IS NOT NULL AND nombre_vendedor IS NOT NULL
        `);

        const mapping = userRes.rows;
        console.log(`Found ${mapping.length} users with aliases.`);

        // 2. Update Venta
        console.log('\n--- UPDATING VENTA ---');
        for (const u of mapping) {
            const res = await client.query(`
                UPDATE venta 
                SET vendedor_cliente = $1 
                WHERE vendedor_cliente = $2
            `, [u.nombre_vendedor, u.alias]);

            if (res.rowCount > 0) {
                console.log(`Updated Venta: ${u.alias} -> ${u.nombre_vendedor} (${res.rowCount} rows)`);
            }
        }

        // 3. Update Abono
        console.log('\n--- UPDATING ABONO ---');
        for (const u of mapping) {
            const res = await client.query(`
                UPDATE abono 
                SET vendedor_cliente = $1 
                WHERE vendedor_cliente = $2
            `, [u.nombre_vendedor, u.alias]);

            if (res.rowCount > 0) {
                console.log(`Updated Abono: ${u.alias} -> ${u.nombre_vendedor} (${res.rowCount} rows)`);
            }
        }

        console.log('\n✅ Migration complete.');

    } catch (err) {
        console.error('FATAL ERROR:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
