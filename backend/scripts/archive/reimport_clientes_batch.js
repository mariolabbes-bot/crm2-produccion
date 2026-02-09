require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FILE_PATH = path.join(__dirname, '../bulk_data/CLIENTES 15-01-26.xlsx');
const BATCH_SIZE = 1000;

async function reimportBatch() {
    const client = await pool.connect();
    try {
        console.log('--- RE-IMPORTANDO CLIENTES (BATCH MODE) ---');

        // 1. TRUNCATE
        console.log('⚠️  TRUNCATING table "cliente"...');
        await client.query('TRUNCATE TABLE cliente RESTART IDENTITY CASCADE');
        console.log('✅  Table truncated.');

        // 2. READ EXCEL
        console.log(`📂 Reading file: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1, defval: null });

        console.log(`📊 Found ${rows.length} raw rows.`);

        // 3. PREPARE DATA (DEDUPLICATE)
        const rowsMap = new Map();
        for (const row of rows) {
            // 0: Rut, 1: Nombre, 2: Email, 3: Tel, 4: Sucursal, 5: Cat, 6: SubCat, 7: Comuna, 8: Ciudad, 9: Dir, 10: Num, 11: Vendedor
            const rawRut = row[0];
            if (rawRut) {
                const rut = String(rawRut).trim();
                rowsMap.set(rut, {
                    rut: rut,
                    nombre: row[1] ? String(row[1]).trim() : 'Sin Nombre',
                    email: row[2] ? String(row[2]).trim() : null,
                    telefono: row[3] ? String(row[3]).trim() : null,
                    sucursal: row[4] ? String(row[4]).trim() : null,
                    categoria: row[5] ? String(row[5]).trim() : null,
                    subcategoria: row[6] ? String(row[6]).trim() : null,
                    comuna: row[7] ? String(row[7]).trim() : null,
                    ciudad: row[8] ? String(row[8]).trim() : null,
                    direccion: row[9] ? String(row[9]).trim() : null,
                    numero: row[10] ? String(row[10]).trim() : null,
                    nombre_vendedor: row[11] ? String(row[11]).trim() : null
                });
            }
        }
        const validRows = Array.from(rowsMap.values());
        console.log(`✅ Filtered valid rows (deduplicated): ${validRows.length}`);

        // 4. BATCH INSERT
        let inserted = 0;

        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
            const batch = validRows.slice(i, i + BATCH_SIZE);

            // Build Query
            const values = [];
            const placeholders = [];
            let pIndex = 1;

            batch.forEach(item => {
                placeholders.push(`($${pIndex}, $${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3}, $${pIndex + 4}, $${pIndex + 5}, $${pIndex + 6}, $${pIndex + 7}, $${pIndex + 8}, $${pIndex + 9}, $${pIndex + 10}, $${pIndex + 11})`);
                values.push(
                    item.rut, item.nombre, item.email, item.telefono, item.sucursal,
                    item.categoria, item.subcategoria, item.comuna, item.ciudad, item.direccion,
                    item.numero, item.nombre_vendedor
                );
                pIndex += 12;
            });

            const query = `
                INSERT INTO cliente (
                    rut, nombre, email, telefono_principal, sucursal, 
                    categoria, subcategoria, comuna, ciudad, direccion, 
                    numero, nombre_vendedor
                ) VALUES ${placeholders.join(', ')}
            `;

            await client.query(query, values);
            inserted += batch.length;
            process.stdout.write(`\r🚀 Inserted: ${inserted} / ${validRows.length}`);
        }

        console.log(`\n✅  DONE. Total Inserted: ${inserted}`);

    } catch (err) {
        console.error('\n❌ FATAL ERROR:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

reimportBatch();
