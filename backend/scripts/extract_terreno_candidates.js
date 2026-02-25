require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/db');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const norm = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

const allowedVendors = [
    'alex', 'eduardo rojas', 'joaquin', 'jorge',
    'matias felipe', 'nelson', 'omar', 'roberto', 'victoria'
];

async function runExport() {
    const client = await pool.connect();
    try {
        console.log('Fetching distinct vendors directly from the clients table...');
        const vendorRes = await client.query('SELECT DISTINCT nombre_vendedor FROM cliente WHERE nombre_vendedor IS NOT NULL');
        const validVendorNames = new Set();

        vendorRes.rows.forEach(row => {
            const dbName = row.nombre_vendedor;
            const normalizedDbName = norm(dbName);

            // Fuzzy match: if the db string contains any of our allowed vendor tags
            const isAllowed = allowedVendors.some(av => normalizedDbName.includes(norm(av)));

            if (isAllowed) {
                validVendorNames.add(dbName.trim());
            }
        });

        console.log(`Matched EXACT vendor names in DB: ${Array.from(validVendorNames).join(' | ')}`);

        if (validVendorNames.size === 0) {
            console.log('No vendors matched! Check your criteria.');
            return;
        }

        const params = Array.from(validVendorNames);
        const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

        console.log('Running main query for candidates...');
        // Calculate using an exact 365 Days window from "today". But business-wise, it's safer to use intervals.
        const query = `
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.comuna,
        c.ciudad,
        c.nombre_vendedor,
        COALESCE(
          (SELECT SUM(valor_total) / 12.0 
           FROM venta v 
           WHERE v.identificador = c.rut 
             AND v.fecha_emision >= CURRENT_DATE - INTERVAL '1 year'), 0
        ) AS avg_sales_12m,
        EXISTS (
          SELECT 1 FROM venta v2 
          WHERE v2.identificador = c.rut 
            AND EXTRACT(YEAR FROM v2.fecha_emision) = 2026
        ) AS has_sales_2026
      FROM cliente c
      WHERE TRIM(c.nombre_vendedor) IN (${placeholders})
    `;

        const res = await client.query(query, params);
        const clients = res.rows;
        console.log(`Found ${clients.length} clients for these vendors total.`);

        // Apply filtering
        const candidates = clients.filter(c => {
            const avgSales = parseFloat(c.avg_sales_12m);
            return avgSales > 100000 || c.has_sales_2026;
        });

        console.log(`Filtered down to ${candidates.length} candidates that meet the criteria.`);

        // Formatting for excel
        const excelData = candidates.map(c => ({
            RUT: c.rut,
            Nombre: c.nombre,
            Vendedor: c.nombre_vendedor,
            Direccion: c.direccion,
            Comuna: c.comuna,
            Ciudad: c.ciudad,
            'Promedio Ventas (12 Meses)': parseFloat(c.avg_sales_12m).toFixed(0),
            'Ventas en 2026': c.has_sales_2026 ? 'SI' : 'NO',
            'Cumple Criterio Por': (parseFloat(c.avg_sales_12m) > 100000 && c.has_sales_2026) ? 'Ambos' : ((parseFloat(c.avg_sales_12m) > 100000) ? 'Volumen (>100k)' : 'Recencia (Venta 2026)')
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Candidatos Terreno");

        const outDir = path.join(__dirname, '../outputs');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        const outPath = path.join(outDir, 'candidatos_en_terreno.xlsx');
        XLSX.writeFile(wb, outPath);

        console.log(`Excel file generated successfully at: ${outPath}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
        pool.end().catch(() => { });
    }
}

runExport();
