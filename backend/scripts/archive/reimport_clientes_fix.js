require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FILE_PATH = path.join(__dirname, '../bulk_data/CLIENTES 15-01-26.xlsx');

async function reimport() {
    const client = await pool.connect();
    try {
        console.log('--- RE-IMPORTANDO CLIENTES (FIX VENDEDORES) ---');

        // 1. TRUNCATE
        console.log('⚠️  TRUNCATING table "cliente"...');
        await client.query('TRUNCATE TABLE cliente RESTART IDENTITY CASCADE');
        console.log('✅  Table truncated.');

        // 2. READ EXCEL
        console.log(`📂 Reading file: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1, defval: null }); // Skip header row

        console.log(`📊 Found ${rows.length} rows.`);

        // 3. INSERT
        console.log('🚀 Inserting data...');
        let inserted = 0;
        let errors = 0;

        for (const row of rows) {
            // Map by index based on inspection
            // 0: Rut, 1: Nombre, 2: Email, 3: Tel, 4: Sucursal, 5: Cat, 6: SubCat, 7: Comuna, 8: Ciudad, 9: Dir, 10: Num, 11: Vendedor
            const rut = row[0];
            const nombre = row[1];
            const email = row[2];
            const telefono = row[3];
            const sucursal = row[4];
            const categoria = row[5];
            const subcategoria = row[6];
            const comuna = row[7];
            const ciudad = row[8];
            const direccion = row[9];
            const numero = row[10];
            const nombreVendedor = row[11];

            if (!rut) continue;

            try {
                await client.query(`
                    INSERT INTO cliente (
                        rut, nombre, email, telefono_principal, sucursal, 
                        categoria, subcategoria, comuna, ciudad, direccion, 
                        numero, nombre_vendedor
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    rut, nombre, email, telefono, sucursal,
                    categoria, subcategoria, comuna, ciudad, direccion,
                    numero, nombreVendedor
                ]);
                inserted++;
            } catch (err) {
                console.error(`❌ Error inserting ${rut}: ${err.message}`);
                errors++;
            }
        }

        console.log(`\n✅  DONE.`);
        console.log(`Inserted: ${inserted}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('FATAL ERROR:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

reimport();
