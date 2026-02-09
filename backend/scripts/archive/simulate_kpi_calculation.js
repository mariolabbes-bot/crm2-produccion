const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const EXCEL_PATH = path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026/VENTAS.xlsx');

async function simulate() {
    console.log('--- SIMULACIÓN DE CÁLCULO DE KPIS (EXCEL vs MAESTRO) ---');
    console.log(`Leyendo Excel: ${path.basename(EXCEL_PATH)}`);

    // 1. Load Matcher
    const masterRes = await pool.query("SELECT sku, familia, subfamilia, marca, litros FROM clasificacion_productos");
    const masterMap = new Map();
    masterRes.rows.forEach(r => {
        masterMap.set(String(r.sku).trim().toUpperCase(), r); // Normalize key
    });
    console.log(`Maestro cargado: ${masterMap.size} productos.`);

    // 2. Load Excel
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet); // Rows as objects

    // Find key column names (SKU, Cantidad, Descripción)
    // Use first row to detect keys
    const headerRow = data[0];
    const findKey = (pattern) => Object.keys(headerRow).find(k => k.toLowerCase().includes(pattern));

    const colSku = findKey('sku');
    const colCant = findKey('cantidad');
    const colDesc = findKey('descripci') || findKey('art'); // descripcion y articulo

    console.log(`Columnas detectadas -> SKU: ${colSku}, Cantidad: ${colCant}, Desc: ${colDesc}`);

    // 3. Accumulators
    let totals = {
        lubricantes: { liters: 0, count: 0 },
        tbr_aplus: { units: 0, count: 0 },
        pcr_aplus: { units: 0, count: 0 },
        reencauche: { units: 0, count: 0 }
    };

    let logs = [];

    // 4. Iterate
    let processed = 0;
    for (const row of data) {
        if (!row[colSku]) continue;

        const skuRaw = String(row[colSku]).trim();
        const skuNorm = skuRaw.toUpperCase();
        const qty = parseFloat(row[colCant]) || 0;
        const desc = row[colDesc] || '';

        // Look up in Master
        const product = masterMap.get(skuNorm);

        let matchedCategory = null; // For logging
        let valueAdded = 0;

        if (product) {
            // LOGIC 1: LUBRICANTES
            // Criteria: Family = 'LUBRICANTES'
            if (product.familia && product.familia.toUpperCase() === 'LUBRICANTES') {
                const liters = parseFloat(product.litros) || 0;
                const contribution = qty * liters;
                totals.lubricantes.liters += contribution;
                totals.lubricantes.count += 1;
                matchedCategory = `LUBRICANTES (Litros=${liters})`;
                valueAdded = contribution;
            }

            // LOGIC 2: TBR APLUS
            // Subfam = 'NEUMATICOS TBR', Marca = 'APLUS'
            if (product.subfamilia && product.subfamilia.toUpperCase() === 'NEUMATICOS TBR' &&
                product.marca && product.marca.toUpperCase() === 'APLUS') {
                totals.tbr_aplus.units += qty;
                totals.tbr_aplus.count += 1;
                matchedCategory = 'TBR APLUS';
                valueAdded = qty;
            }

            // LOGIC 3: PCR APLUS
            if (product.subfamilia && product.subfamilia.toUpperCase() === 'NEUMATICOS PCR' &&
                product.marca && product.marca.toUpperCase() === 'APLUS') {
                totals.pcr_aplus.units += qty;
                totals.pcr_aplus.count += 1;
                matchedCategory = 'PCR APLUS';
                valueAdded = qty;
            }

            // LOGIC 4: REENCAUCHE
            if (product.familia && product.familia.toUpperCase() === 'REENCAUCHE') {
                totals.reencauche.units += qty;
                totals.reencauche.count += 1;
                matchedCategory = 'REENCAUCHE';
                valueAdded = qty;
            }
        }

        // Log interesting cases (e.g. matched something, or missed despite description match)
        const isTargetDesc = (desc.includes('SHELL') || desc.includes('APLUS') || desc.includes('LUB') || desc.includes('REENC'));

        if (matchedCategory || (isTargetDesc && !product)) {
            // Only keep last 50 logs of interest to avoid huge output
            if (logs.length < 50) {
                logs.push({
                    sku: skuRaw,
                    desc: desc.substring(0, 30),
                    qty,
                    masterData: product ? `${product.familia}|${product.brand}|${product.litres}` : 'NOT FOUND',
                    result: matchedCategory ? `✅ Suma ${valueAdded.toFixed(1)} a ${matchedCategory}` : '❌ Ignorado (No match or filtering)'
                });
            }
        }
        processed++;
    }

    // 5. Output
    console.log(`\n--- RESULTADOS SIMULACIÓN (${processed} filas procesadas) ---`);

    console.log('\nMuestra de Procesamiento (Primeros 20 casos relevantes):');
    logs.slice(0, 20).forEach(l => {
        console.log(`[${l.sku}] ${l.desc} -> ${l.result}`);
    });

    console.log('\n--- TOTALES SIMULADOS ---');
    console.log(`Lubricantes: ${totals.lubricantes.liters.toFixed(2)} Litros (de ${totals.lubricantes.count} ventas)`);
    console.log(`TBR Aplus:   ${totals.tbr_aplus.units.toFixed(0)} Unidades (de ${totals.tbr_aplus.count} ventas)`);
    console.log(`PCR Aplus:   ${totals.pcr_aplus.units.toFixed(0)} Unidades (de ${totals.pcr_aplus.count} ventas)`);
    console.log(`Reencauche:  ${totals.reencauche.units.toFixed(0)} Unidades (de ${totals.reencauche.count} ventas)`);

    await pool.end();
}

simulate();
