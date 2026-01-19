
const path = require('path');
// Try to load dotenv from current directory or backend directory
try {
    require('dotenv').config({ path: path.resolve(__dirname, 'backend', '.env') });
} catch (e) {
    console.log('Could not load dotenv, hoping environment variables are set');
}

const { Pool } = require('pg');

// Manually create pool if needed to ensure correct config
const connStr = process.env.DATABASE_URL;
const isLocal = connStr && (connStr.includes('localhost') || connStr.includes('127.0.0.1') || connStr.includes('::1'));

console.log('Connecting to:', connStr ? 'Database URL present' : 'No Database URL');
console.log('SSL Mode:', isLocal ? 'Disabled' : 'Enabled');

const pool = new Pool({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        const tableNames = ['venta', 'abono', 'saldo_credito', 'estado_cuenta', 'estado_cuenta_diario', 'producto', 'cliente', 'usuario'];

        // Construct the query dynamically for the specified tables
        const query = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position;
    `;

        const res = await pool.query(query, [tableNames]);

        if (res.rows.length === 0) {
            console.log('No columns found for the specified tables.');
        } else {
            let currentTable = '';
            res.rows.forEach(row => {
                if (row.table_name !== currentTable) {
                    console.log(`\nTable: ${row.table_name}`);
                    console.log('--------------------------------------------------');
                    currentTable = row.table_name;
                }
                console.log(`  - ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            });
        }

    } catch (err) {
        console.error('Error querying schema:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
