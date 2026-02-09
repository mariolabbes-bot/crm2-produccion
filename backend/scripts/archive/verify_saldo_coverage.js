require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('--- SALDO CREDITO COVERAGE VERIFICATION ---');

        // 1. Total Count
        const countRes = await client.query('SELECT COUNT(*) FROM saldo_credito');
        const total = parseInt(countRes.rows[0].count);
        console.log(`Total Records: ${total}`);

        // 2. Null Vendors
        const nullRes = await client.query('SELECT COUNT(*) FROM saldo_credito WHERE nombre_vendedor IS NULL');
        const nulls = parseInt(nullRes.rows[0].count);
        console.log(`NULL Vendors: ${nulls}`);

        // 3. Distribution of Vendor Names
        console.log('\nTop 20 Vendors Assignment:');
        const distRes = await client.query(`
            SELECT nombre_vendedor, COUNT(*) as c 
            FROM saldo_credito 
            GROUP BY nombre_vendedor 
            ORDER BY c DESC 
            LIMIT 20
        `);
        console.table(distRes.rows);

        // 4. Check consistency with User table
        // Are the names in saldo_credito actually present in usuario.nombre_vendedor?
        console.log('\nChecking for names NOT in usuario.nombre_vendedor (Source of Truth):');
        const mismatchRes = await client.query(`
            SELECT sc.nombre_vendedor, COUNT(*) as count
            FROM saldo_credito sc
            LEFT JOIN usuario u ON sc.nombre_vendedor = u.nombre_vendedor
            WHERE sc.nombre_vendedor IS NOT NULL AND u.nombre_vendedor IS NULL
            GROUP BY sc.nombre_vendedor
        `);

        if (mismatchRes.rows.length === 0) {
            console.log('✅ All assigned names match exactly with `usuario.nombre_vendedor`.');
        } else {
            console.log('⚠️ Found names in saldo_credito that do NOT match `usuario.nombre_vendedor`:');
            console.table(mismatchRes.rows);
            console.log('(These might be raw names from Excel that failed mapping)');
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
