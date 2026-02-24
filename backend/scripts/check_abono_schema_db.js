const pool = require('../src/db');

async function checkSchema() {
    try {
        console.log('🔍 consultando esquema de tabla abono...');

        // Columns
        const resCols = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'abono'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 Columnas:');
        console.table(resCols.rows);

        // Constraints (PK, Unique)
        const resConstraints = await pool.query(`
            SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = 'abono'
            ORDER BY tc.constraint_name, kcu.ordinal_position
        `);
        console.log('\n🔒 Constraints:');
        console.table(resConstraints.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
