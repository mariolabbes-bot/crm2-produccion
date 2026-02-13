
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function inspectTable() {
    try {
        console.log('--- INSPECTING CLIENTE TABLE ---');

        // Query to get columns and constraints
        const query = `
            SELECT 
                column_name, 
                data_type, 
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'cliente';
        `;

        const res = await pool.query(query);
        console.log('Columns:', res.rows);

        const constraintsQuery = `
            SELECT 
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name 
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = 'cliente'
            AND tc.constraint_type = 'PRIMARY KEY';
        `;
        const constraints = await pool.query(constraintsQuery);
        console.log('Primary Key Columns:', constraints.rows);

        const uniqueConstraintsQuery = `
            SELECT 
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name 
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = 'cliente'
            AND tc.constraint_type = 'UNIQUE';
        `;
        const uniqueConstraints = await pool.query(uniqueConstraintsQuery);
        console.log('Unique Columns:', uniqueConstraints.rows);


    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

inspectTable();
