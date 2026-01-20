require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function investigate() {
    try {
        console.log('--- DEFINITIVE VENDOR MAPPING INVESTIGATION ---');

        // 1. SCHEMA INSPECTION
        console.log('\n--- 1. SCHEMA INSPECTION ---');
        const tables = ['usuario', 'venta', 'abono', 'saldo_credito', 'cliente'];
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [table]);
            console.log(`\nTable: ${table}`);
            console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        }

        // 2. USER "SOURCE OF TRUTH"
        console.log('\n--- 2. USERS (USUARIO TABLE) ---');
        const usersRes = await pool.query(`
            SELECT rut, nombre_vendedor, alias, rol_usuario 
            FROM usuario 
            ORDER BY nombre_vendedor
        `);
        console.table(usersRes.rows);

        const validAliases = new Set(usersRes.rows.map(u => u.alias?.toLowerCase()).filter(Boolean));
        const validNames = new Set(usersRes.rows.map(u => u.nombre_vendedor?.toLowerCase()).filter(Boolean));

        // 3. SALES VENDORS
        console.log('\n--- 3. VENDOR IN SALES (VENTA.vendedor_cliente) ---');
        const salesStats = await pool.query(`
            SELECT vendeur as vendor_name, COUNT(*) as count
            FROM (SELECT COALESCE(vendedor_cliente, 'NULL') as vendeur FROM venta) sub
            GROUP BY vendeur
            ORDER BY count DESC
        `);

        const salesMapping = salesStats.rows.map(r => {
            const name = r.vendor_name.toLowerCase();
            let status = 'UNKNOWN';
            if (validAliases.has(name)) status = 'MATCH_ALIAS';
            else if (validNames.has(name)) status = 'MATCH_FULLNAME';
            return { ...r, status };
        });
        console.table(salesMapping);

        // 4. ABONOS VENDORS
        console.log('\n--- 4. VENDOR IN ABONOS (ABONO.vendedor_cliente) ---');
        // Check if column exists first based on previous step, but assuming yes from code reading
        const abonoStats = await pool.query(`
            SELECT vendeur as vendor_name, COUNT(*) as count
            FROM (SELECT COALESCE(vendedor_cliente, 'NULL') as vendeur FROM abono) sub
            GROUP BY vendeur
            ORDER BY count DESC
        `);

        const abonoMapping = abonoStats.rows.map(r => {
            const name = r.vendor_name.toLowerCase();
            let status = 'UNKNOWN';
            if (validAliases.has(name)) status = 'MATCH_ALIAS';
            else if (validNames.has(name)) status = 'MATCH_FULLNAME';
            return { ...r, status };
        });
        console.table(abonoMapping);

        // 5. SALDO CREDITO VENDORS
        console.log('\n--- 5. VENDOR IN SALDO_CREDITO (SALDO_CREDITO.nombre_vendedor) ---');
        const saldoStats = await pool.query(`
            SELECT vendeur as vendor_name, COUNT(*) as count
            FROM (SELECT COALESCE(nombre_vendedor, 'NULL') as vendeur FROM saldo_credito) sub
            GROUP BY vendeur
            ORDER BY count DESC
        `);

        const saldoMapping = saldoStats.rows.map(r => {
            const name = r.vendor_name.toLowerCase();
            let status = 'UNKNOWN';
            if (validAliases.has(name)) status = 'MATCH_ALIAS';
            else if (validNames.has(name)) status = 'MATCH_FULLNAME';
            return { ...r, status };
        });
        console.table(saldoMapping);

        // 6. CLIENTE VENDORS
        console.log('\n--- 6. VENDOR IN CLIENTE (CLIENTE.nombre_vendedor vs CLIENTE.vendedor_id) ---');
        // Let's check for rows that have inconsistencies (e.g. name set but id null, or mismatch?)
        // Since we don't know if nombre_vendedor exists yet (step 1 will confirm), I'll wrap in try/catch or just list what I can.
        // Assuming nombre_vendedor exists based on `findFacturasImpagas`.
        try {
            const clientStats = await pool.query(`
                SELECT 
                    c.nombre_vendedor, 
                    COUNT(*) as count
                FROM cliente c
                GROUP BY c.nombre_vendedor
                ORDER BY count DESC
                LIMIT 50
            `);
            console.table(clientStats.rows);
        } catch (e) {
            console.log("Could not query cliente stats fully: " + e.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

investigate();
