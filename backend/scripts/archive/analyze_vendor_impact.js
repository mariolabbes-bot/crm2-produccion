
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const files = [
    { name: 'ABONOS_19-01-2026.xlsx', type: 'abono', colRegex: [/^Vendedor.*clie/i, /^Vendedor/i] },
    { name: 'CLIENTES_19-01-2026.xlsx', type: 'cliente', colRegex: [/^Nombre.*vendedor$/i, /^Vendedor$/i] },
    { name: 'VENTAS_19-01-2026.xlsx', type: 'venta', colRegex: [/^Vendedor.*cliente$/i, /^Alias.*vendedor$/i] }
];

const bulkDir = path.join(__dirname, '../bulk_data');

async function analyze() {
    const client = await pool.connect();
    try {
        console.log('🔵 Loading DB Users (Aliases)...');
        const usersRes = await client.query("SELECT alias, nombre_vendedor FROM usuario");
        const aliasMap = new Map();
        const dbVendors = new Set();

        usersRes.rows.forEach(u => {
            const fullName = u.nombre_vendedor;
            if (fullName) {
                dbVendors.add(fullName);
                aliasMap.set(fullName.toLowerCase().trim(), fullName);
            }
            if (u.alias) {
                aliasMap.set(u.alias.toLowerCase().trim(), fullName);
            }
        });

        console.log(`✅ Loaded ${dbVendors.size} distinct vendors from DB.`);

        const report = {};

        for (const f of files) {
            const filePath = path.join(bulkDir, f.name);
            if (!fs.existsSync(filePath)) {
                console.log(`[SKIP] ${f.name} not found`);
                continue;
            }

            console.log(`\n📂 Analyzing ${f.name}...`);
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            const headers = Object.keys(data[0] || {});
            const vendorCol = headers.find(h => f.colRegex.some(p => p.test(h)));

            if (!vendorCol) {
                console.log(`❌ No vendor column found in ${f.name}`);
                continue;
            }

            console.log(`Found Vendor Column: "${vendorCol}"`);

            const newStubs = new Set();
            const matched = new Set();

            data.forEach(row => {
                const raw = row[vendorCol];
                if (raw) {
                    const s = String(raw).trim();
                    if (aliasMap.has(s.toLowerCase())) {
                        matched.add(s);
                    } else {
                        newStubs.add(s);
                    }
                }
            });

            report[f.name] = {
                matchedCount: matched.size,
                stubsCount: newStubs.size,
                stubsList: Array.from(newStubs)
            };

            if (newStubs.size > 0) {
                console.log(`⚠️  RISK: Would create ${newStubs.size} STUBS`);
                console.log('   Full List:', JSON.stringify(Array.from(newStubs), null, 2));
            } else {
                console.log('✅ PERFECT MATCH: No new stubs would be created.');
            }
        }

        return report;

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

analyze();
