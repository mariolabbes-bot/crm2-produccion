require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixAlex() {
    try {
        console.log('--- FIXING ALEX ALIAS ---');
        // Alex Mauricio Mondaca Cortes -> Rut ends in 857-9 (from previous log: 11.599.857-9)
        // Sales name: 'Alex'

        // 1. Set alias
        const res = await pool.query(`
        UPDATE usuario 
        SET alias = 'Alex' 
        WHERE rut = '11.599.857-9'
    `);
        console.log(`Updated: ${res.rowCount} row(s)`);

        // 2. Verify
        const check = await pool.query("SELECT * FROM usuario WHERE rut = '11.599.857-9'");
        console.table(check.rows);

    } catch (err) {
        if (err.code === '23505') { // Unique constraint
            console.log("Alias 'Alex' already taken by STUB. Detaching stub...");
            await pool.query("UPDATE usuario SET alias = NULL WHERE alias = 'Alex' AND rut LIKE 'STUB%'");
            await pool.query("UPDATE usuario SET alias = 'Alex' WHERE rut = '11.599.857-9'");
            console.log("Retry Success: Alias assigned to real Alex.");
        } else {
            console.error(err);
        }
    } finally {
        await pool.end();
    }
}

fixAlex();
