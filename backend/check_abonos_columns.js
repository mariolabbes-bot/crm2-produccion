const pool = require('./src/db');

async function checkColumns() {
    try {
        console.log('--- Checking Abono Columns ---');
        // Check schema
        const schemaRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'abono' AND column_name IN ('monto', 'monto_neto', 'folio')
        `);
        console.table(schemaRes.rows);

        // Check data sample
        const dataRes = await pool.query(`
            SELECT folio, monto, monto_neto 
            FROM abono 
            WHERE monto_neto IS NOT NULL AND monto_neto > 0 
            LIMIT 5
        `);
        console.log('\n--- Data Sample (With Net Amount) ---');
        console.table(dataRes.rows);

        // Check if there are rows where (monto / 1.19) is roughly equal to monto_neto
        const calcRes = await pool.query(`
            SELECT folio, monto, monto_neto, (monto::numeric / 1.19)::int as calculated_net
            FROM abono 
            WHERE monto_neto IS NOT NULL 
            LIMIT 5
        `);
        console.log('\n--- Calculation Check ---');
        console.table(calcRes.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkColumns();
