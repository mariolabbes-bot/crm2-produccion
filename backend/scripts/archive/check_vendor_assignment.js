
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

async function checkAssignment() {
    const client = await pool.connect();
    try {
        console.log('🔍 ANALYZING VENDOR ASSIGNMENT COVERAGE...\n');

        const tables = [
            { name: 'cliente', col: 'nombre_vendedor' },
            { name: 'venta', col: 'vendedor_cliente' },
            { name: 'abono', col: 'vendedor_cliente' },
            { name: 'saldo_credito', col: 'nombre_vendedor' }
        ];

        for (const t of tables) {
            console.log(`--- Table: ${t.name} ---`);

            const totalRes = await client.query(`SELECT count(*) FROM ${t.name}`);
            const total = parseInt(totalRes.rows[0].count);

            const unassignedRes = await client.query(`SELECT count(*) FROM ${t.name} WHERE ${t.col} IS NULL OR ${t.col} = '' OR ${t.col} = 'null'`);
            const unassigned = parseInt(unassignedRes.rows[0].count);

            const stubRes = await client.query(`
        SELECT count(*) FROM ${t.name} 
        WHERE ${t.col} LIKE 'STUB%' OR ${t.col} ILIKE '%Unknown%'
      `);
            const stubs = parseInt(stubRes.rows[0].count);

            const orphanedRes = await client.query(`
        SELECT DISTINCT t.${t.col} 
        FROM ${t.name} t
        LEFT JOIN usuario u ON (LOWER(t.${t.col}) = LOWER(u.nombre_vendedor) OR LOWER(t.${t.col}) = LOWER(u.alias))
        WHERE t.${t.col} IS NOT NULL AND t.${t.col} != '' AND u.rut IS NULL
        LIMIT 10
      `);
            const orphanedCountRes = await client.query(`
        SELECT COUNT(DISTINCT t.${t.col}) 
        FROM ${t.name} t
        LEFT JOIN usuario u ON (LOWER(t.${t.col}) = LOWER(u.nombre_vendedor) OR LOWER(t.${t.col}) = LOWER(u.alias))
        WHERE t.${t.col} IS NOT NULL AND t.${t.col} != '' AND u.rut IS NULL
      `);
            const orphanedCount = parseInt(orphanedCountRes.rows[0].count);

            console.log(`Total: ${total}`);
            console.log(`Unassigned (NULL/Empty): ${unassigned} (${total > 0 ? ((unassigned / total) * 100).toFixed(2) : 0}%)`);
            console.log(`Assigned to "STUB/Unknown": ${stubs} (${total > 0 ? ((stubs / total) * 100).toFixed(2) : 0}%)`);
            console.log(`Orphaned Vendor Names (Not in Users Table): ${orphanedCount}`);
            if (orphanedCount > 0) {
                console.log(`Sample Orphaned: ${orphanedRes.rows.map(r => r[t.col]).join(', ')}`);
            }
            console.log('------------------------\n');
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

checkAssignment();
