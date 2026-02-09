require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

async function verifyCounts() {
    console.log('📊 Verifying Database Counts...');

    // Try connecting with SSL first, then without
    let pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        await pool.query('SELECT 1');
        console.log('✅ Connected with SSL');
    } catch (e) {
        console.warn("⚠️ SSL Connection failed, trying non-SSL...");
        await pool.end();
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false,
            connectionTimeoutMillis: 5000
        });
        try {
            await pool.query('SELECT 1');
            console.log('✅ Connected without SSL');
        } catch (e2) {
            console.error("❌ Both connection methods failed.");
            console.error("SSL Error:", e.message);
            console.error("Non-SSL Error:", e2.message);
            return;
        }
    }

    try {
        const tables = ['venta', 'abono', 'cliente', 'saldo_credito', 'usuario'];

        for (const table of tables) {
            const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   - ${table}: ${res.rows[0].count} records`);
        }

        // Verify recent data (imported today)
        console.log('\n🕒 Records created/updated in the last 24 hours:');
        const recentQueries = {
            'venta': "SELECT COUNT(*) FROM venta WHERE created_at > NOW() - INTERVAL '1 day'",
            'abono': "SELECT COUNT(*) FROM abono WHERE created_at > NOW() - INTERVAL '1 day'",
            'saldo_credito': "SELECT COUNT(*) FROM saldo_credito WHERE created_at > NOW() - INTERVAL '1 day'",
        };

        for (const [table, query] of Object.entries(recentQueries)) {
            const res = await pool.query(query);
            console.log(`   - ${table} (recent): ${res.rows[0].count}`);
        }

        // Check for specific standardization issues
        console.log('\n🔍 Integrity Checks:');

        // Check for Stubs
        const stubRes = await pool.query("SELECT COUNT(*) FROM usuario WHERE rut LIKE 'STUB-%'");
        console.log(`   - STUB Users created: ${stubRes.rows[0].count}`);

        // Check for Null Vendors in Sales
        const nullVendorSales = await pool.query("SELECT COUNT(*) FROM venta WHERE vendedor_cliente IS NULL AND vendedor_documento IS NULL");
        console.log(`   - Sales with NO Vendor identified: ${nullVendorSales.rows[0].count}`);

        // Check for Abonos with Null Vendor
        const nullVendorAbonos = await pool.query("SELECT COUNT(*) FROM abono WHERE vendedor_cliente IS NULL");
        console.log(`   - Abonos with NO Vendor identified: ${nullVendorAbonos.rows[0].count}`);

    } catch (err) {
        console.error('❌ Error executing verification:', err);
    } finally {
        await pool.end();
    }
}

verifyCounts();
