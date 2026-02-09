require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

async function verifyClients() {
    console.log('📊 Verifying Client Import...');

    // 1. Analyze Excel
    const excelPath = '/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/backend/bulk_data/IMPORTACION 08-02-2026/CLIENTES AL 08-02-2026.xlsx';
    let excelCount = 0;

    if (fs.existsSync(excelPath)) {
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        excelCount = data.length;
        console.log(`📄 Excel Rows (new clients in file): ${excelCount}`);
    } else {
        console.log(`❌ Excel file not found at: ${excelPath}`);
    }

    // 2. Connect DB (SSL Fix)
    let pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        await pool.query('SELECT 1');
    } catch (e) {
        await pool.end();
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false,
            connectionTimeoutMillis: 5000
        });
    }

    try {
        const dbCountRes = await pool.query('SELECT COUNT(*) FROM cliente');
        const dbCount = parseInt(dbCountRes.rows[0].count);
        console.log(`🗄️  Total Database Clients: ${dbCount}`);

        // Check recent clients (created today)
        const recentRes = await pool.query("SELECT COUNT(*) FROM cliente WHERE created_at > NOW() - INTERVAL '1 day'"); // Note: cliente table might not have created_at populated correctly on upsert, but new ones inserted should have it if default NOW() is set.
        // Actually, let's verify if `created_at` exists in schema first? 
        // Based on previous `verify_db_counts`, it seemed `cliente` didn't show recent counts because maybe it was updates?
        // Let's assume most were updates if count is high.

        console.log('\n🕵️‍♂️ Analyzing STUB Users (potential vendor mismatches):');
        const stubs = await pool.query("SELECT * FROM usuario WHERE rut LIKE 'STUB-%' ORDER BY created_at DESC");

        if (stubs.rows.length === 0) {
            console.log('   ✅ No STUB users found.');
        } else {
            console.log(`   ⚠️ Found ${stubs.rows.length} STUB users.`);
            console.log('   Most recent 5:');
            stubs.rows.slice(0, 5).forEach(u => {
                console.log(`     - ${u.nombre_vendedor} (Alias: ${u.alias}) - Created: ${u.created_at}`);
            });
        }

    } catch (err) {
        console.error('❌ DB Error:', err);
    } finally {
        await pool.end();
    }
}

verifyClients();
