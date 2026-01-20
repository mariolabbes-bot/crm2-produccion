const pool = require('./src/db');

async function fixNulls() {
    try {
        console.log('--- Standardizing NULL identifiers to empty string ---');
        const res = await pool.query(`
            UPDATE abono 
            SET identificador_abono = '' 
            WHERE identificador_abono IS NULL
        `);
        console.log(`Updated ${res.rowCount} rows.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixNulls();
