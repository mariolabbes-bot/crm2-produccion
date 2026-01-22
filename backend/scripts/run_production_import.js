const path = require('path');
const fs = require('fs');
process.env.DB_SSL = 'false';
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { processClientesFileAsync } = require('../src/services/importers/clientes');
const { processVentasFileAsync } = require('../src/services/importers/ventas');
const { processAbonosFileAsync } = require('../src/services/importers/abonos');
const { processSaldoCreditoFileAsync } = require('../src/services/importers/saldo_credito');
const { createJob } = require('../src/services/jobManager');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const importDir = path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026');

async function runImport() {
    console.log('🚀 INITIALIZING BULK IMPORT [21-01-2026]...');

    const client = await pool.connect();
    const baseline = {};
    const tables = ['cliente', 'venta', 'abono', 'saldo_credito'];

    try {
        // 1. Get Baseline
        for (const t of tables) {
            const res = await client.query(`SELECT count(*) FROM ${t}`);
            baseline[t] = parseInt(res.rows[0].count);
        }

        console.log('📊 Baseline Counts:', baseline);

        const jobsConfigs = [
            { name: 'CLIENTES.xlsx', importer: processClientesFileAsync, table: 'cliente', type: 'CLIENTES' },
            { name: 'VENTAS.xlsx', importer: processVentasFileAsync, table: 'venta', type: 'VENTAS' },
            { name: 'ABONOS.xlsx', importer: processAbonosFileAsync, table: 'abono', type: 'ABONOS' },
            { name: 'SALDO CREDITO.xlsx', importer: processSaldoCreditoFileAsync, table: 'saldo_credito', type: 'SALDOCREDITO' }
        ];

        const results = [];

        for (const config of jobsConfigs) {
            const filePath = path.join(importDir, config.name);
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Missing: ${config.name}`);
                continue;
            }

            console.log(`\n📦 Importing ${config.name}...`);

            // Create a proper job in the DB
            const jobId = await createJob(config.type, config.name, 'SYSTEM-BULK');

            try {
                const res = await config.importer(jobId, filePath, config.name);
                results.push({ name: config.name, table: config.table, res });
                console.log(`✅ Finished ${config.name}: ${res.imported || res.inserted || res.updated || 0} processed.`);
            } catch (err) {
                console.error(`❌ Error in ${config.name}:`, err.message);
                results.push({ name: config.name, table: config.table, error: err.message, totalRows: 0 });
            }
        }

        // 2. Post-import counts
        console.log('\n--- FINAL RECONCILIATION REPORT ---');
        const finalCounts = {};
        for (const t of tables) {
            const res = await client.query(`SELECT count(*) FROM ${t}`);
            finalCounts[t] = parseInt(res.rows[0].count);
        }

        console.log('\n| Table | Baseline | Incoming (Excel) | Expected (B+I) | Actual (Final) | Diff (Duplicates/Skips/Full Replace) |');
        console.log('|-------|----------|------------------|----------------|----------------|-------------------------|');

        jobsConfigs.forEach(conf => {
            const r = results.find(res => res.name === conf.name);
            const t = conf.table;
            // Use inserted for saldo_credito because it's a full replace, or r.res.totalRows if present
            let excelRows = 0;
            if (r && r.res) {
                excelRows = r.res.totalRows !== undefined ? r.res.totalRows : (r.res.inserted || 0);
            }

            let expected;
            let diffNote = '';

            if (t === 'saldo_credito') {
                expected = excelRows; // Full replace
                diffNote = '(Full Replace)';
            } else if (t) {
                expected = baseline[t] + excelRows;
                diffNote = '(Upsert/Dups)';
            } else {
                return; // Config without table
            }

            const actual = finalCounts[t];
            const diff = actual - expected;

            console.log(`| ${t.padEnd(13)} | ${String(baseline[t]).padEnd(8)} | ${String(excelRows).padEnd(16)} | ${String(expected).padEnd(14)} | ${String(actual).padEnd(14)} | ${diff} ${diffNote} |`);
        });

    } catch (err) {
        console.error('CRITICAL ERROR:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runImport();
