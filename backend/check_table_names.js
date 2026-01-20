const pool = require('./src/db');

async function checkTables() {
    try {
        console.log('--- Checking Tables ---');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'abono%'
        `);
        console.table(res.rows);

        if (res.rows.some(r => r.table_name === 'abonos')) {
            console.log('WARNING: Found "abonos" table. This might confuse the backend auto-detection.');

            // Check columns of 'abonos'
            const colsRes = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'abonos'
            `);
            console.log('Columns in "abonos":', colsRes.rows.map(r => r.column_name));
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTables();
