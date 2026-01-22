
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const importDir = path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026');
const files = ['CLIENTES.xlsx', 'VENTAS.xlsx', 'ABONOS.xlsx', 'SALDO CREDITO.xlsx'];

async function inspect() {
    const client = await pool.connect();
    try {
        console.log('--- DB BASELINE COUNTS ---');
        const tables = ['cliente', 'venta', 'abono'];
        for (const t of tables) {
            const res = await client.query(`SELECT count(*) FROM ${t}`);
            console.log(`[DB] ${t}: ${res.rows[0].count}`);
        }

        console.log('\n--- FILE INSPECTION ---');
        for (const file of files) {
            const filePath = path.join(importDir, file);
            if (!fs.existsSync(filePath)) {
                console.log(`[MISSING] ${file}`);
                continue;
            }
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const headers = data[0];
            const rowsCount = data.length - 1;

            console.log(`\n[FILE] ${file}`);
            console.log(`[ROWS] ${rowsCount}`);
            console.log(`[HEADERS] ${JSON.stringify(headers)}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}
inspect();
