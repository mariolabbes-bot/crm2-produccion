require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const VENTAS_FILE = path.join(__dirname, '../bulk_data/VENTAS_19-01-2026.xlsx');
const ABONOS_FILE = path.join(__dirname, '../bulk_data/ABONOS_19-01-2026.xlsx');

// Normalization Helper
const norm = (str) => str ? String(str).trim().toLowerCase() : '';

// Helper to simulate standardisation (Alias -> Full Name)
async function getVendorMap(client) {
    // Mirror the logic used in import: Prioritize Real Users!
    const res = await client.query("SELECT alias, nombre_vendedor, rut FROM usuario ORDER BY length(nombre_vendedor) DESC");
    const map = new Map();
    res.rows.forEach(u => {
        const full = u.nombre_vendedor;
        const isStub = u.rut && u.rut.startsWith('STUB');
        const add = (k) => {
            if (!k) return;
            const key = k.toLowerCase().trim();
            if (isStub) {
                if (!map.has(key)) map.set(key, full);
            } else {
                map.set(key, full);
            }
        };
        add(u.alias);
        add(u.nombre_vendedor);
    });
    return map;
}

async function compare() {
    const client = await pool.connect();
    try {
        console.log('--- 2026 DATA DISCREPANCY INVESTIGATION (FIXED) ---');
        const vendorMap = await getVendorMap(client);

        // 1. Process Excel - Sales (RAW DATA Format)
        console.log(`\nReading Excel: ${path.basename(VENTAS_FILE)}`);
        const wbVentas = XLSX.readFile(VENTAS_FILE);
        const dataVentas = XLSX.utils.sheet_to_json(wbVentas.Sheets[wbVentas.SheetNames[0]]); // Raw data with headers

        const excelSalesByVendor = {};
        let excelSalesTotal = 0;

        dataVentas.forEach(row => {
            // Find Vendor Column
            const vendorKey = Object.keys(row).find(k => /Vendedor.*cliente/i.test(k) || /Alias/i.test(k));
            const totalKey = Object.keys(row).find(k => /Valor.*total/i.test(k) || /Total|vebtas/i.test(k));

            let vendorRaw = row[vendorKey] ? String(row[vendorKey]).trim() : 'Unknown';
            // Simulate Mapping
            let vendorFull = vendorMap.get(vendorRaw.toLowerCase()) || vendorRaw;

            let amount = row[totalKey] ? parseFloat(row[totalKey]) : 0;

            if (!excelSalesByVendor[vendorFull]) excelSalesByVendor[vendorFull] = 0;
            excelSalesByVendor[vendorFull] += amount;
            excelSalesTotal += amount;
        });


        // 2. Process Excel - Abonos (Pivot Table Format)
        console.log(`Reading Excel: ${path.basename(ABONOS_FILE)}`);
        const wbAbonos = XLSX.readFile(ABONOS_FILE);
        const dataAbonos = XLSX.utils.sheet_to_json(wbAbonos.Sheets[wbAbonos.SheetNames[0]], { header: 1 });

        const excelAbonosByVendor = {};
        let excelAbonosTotal = 0;

        for (let i = 3; i < dataAbonos.length; i++) {
            const row = dataAbonos[i];
            const vendorRaw = row[0];
            const amount = typeof row[1] === 'number' ? row[1] : 0;

            if (!vendorRaw || vendorRaw === 'Total general') continue;

            let vendorFull = vendorMap.get(String(vendorRaw).toLowerCase().trim()) || vendorRaw;

            if (!excelAbonosByVendor[vendorFull]) excelAbonosByVendor[vendorFull] = 0;
            excelAbonosByVendor[vendorFull] += amount;
            excelAbonosTotal += amount;
        }

        // 3. DB Totals (2026)
        console.log('\nFetching DB Totals for 2026...');
        const dbSalesRes = await client.query(`
            SELECT vendedor_cliente, SUM(valor_total) as total 
            FROM venta 
            WHERE EXTRACT(YEAR FROM fecha_emision) = 2026
            GROUP BY vendedor_cliente
        `);
        const dbAbonosRes = await client.query(`
            SELECT vendedor_cliente, SUM(monto) as total 
            FROM abono 
            WHERE EXTRACT(YEAR FROM fecha) = 2026
            GROUP BY vendedor_cliente
        `);

        // 4. Comparison Table - Sales
        console.log('\n--- SALES 2026 COMPARISON (Excel vs DB) ---');
        console.log(`Excel Total: ${excelSalesTotal.toLocaleString()} | DB Total: ${dbSalesRes.rows.reduce((a, b) => a + Number(b.total), 0).toLocaleString()}`);
        const salesComparison = [];
        const allSalesVendors = new Set([...Object.keys(excelSalesByVendor), ...dbSalesRes.rows.map(r => r.vendedor_cliente)]);

        allSalesVendors.forEach(v => {
            const excelVal = excelSalesByVendor[v] || 0;
            const dbVal = parseFloat(dbSalesRes.rows.find(r => r.vendedor_cliente === v)?.total || 0);
            const diff = dbVal - excelVal;
            if (Math.abs(diff) > 100) { // Tolerance
                salesComparison.push({ Vendor: v, Excel: excelVal, DB: dbVal, Diff: diff });
            }
        });
        console.table(salesComparison.sort((a, b) => b.Diff - a.Diff));
        if (salesComparison.length === 0) console.log('✅ Sales match perfectly!');


        // 5. Comparison Table - Abonos
        console.log('\n--- ABONOS 2026 COMPARISON (Excel vs DB) ---');
        console.log(`Excel Total: ${excelAbonosTotal.toLocaleString()} | DB Total: ${dbAbonosRes.rows.reduce((a, b) => a + Number(b.total), 0).toLocaleString()}`);
        const abonosComparison = [];
        const allAbonosVendors = new Set([...Object.keys(excelAbonosByVendor), ...dbAbonosRes.rows.map(r => r.vendedor_cliente)]);

        allAbonosVendors.forEach(v => {
            const excelVal = excelAbonosByVendor[v] || 0;
            const dbVal = parseFloat(dbAbonosRes.rows.find(r => r.vendedor_cliente === v)?.total || 0);
            const diff = dbVal - excelVal;
            if (Math.abs(diff) > 100) {
                abonosComparison.push({ Vendor: v, Excel: excelVal, DB: dbVal, Diff: diff });
            }
        });
        console.table(abonosComparison.sort((a, b) => b.Diff - a.Diff));
        if (abonosComparison.length === 0) console.log('✅ Abonos match perfectly!');


    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

compare();
