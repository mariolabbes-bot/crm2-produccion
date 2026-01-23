const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FILE_PATH = path.join(__dirname, '../bulk_data/PROCESSED_PRODUCTOS.xlsx');

async function loadMaster() {
    console.log('--- RE-CARGANDO MAESTRO DE PRODUCTOS (INDICES) ---');
    console.log(`Archivo: ${path.basename(FILE_PATH)}`);

    try {
        const workbook = XLSX.readFile(FILE_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // Use header: 1 to get array of arrays [ [row1_col1, row1_col2], ... ]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`Total Filas brutas: ${rows.length}`);

        // Remove Header Row (Assuming row 0 is header)
        const dataRows = rows.slice(1);

        let imported = 0;

        for (const row of dataRows) {
            // Mapping by INDEX based on inspection:
            // 0: SKU
            // 1: Artículo (Descripción)
            // 2: Linea (Familia)
            // 3: Sublinea (Subfamilia)
            // 4: Marca
            // 5: Litros

            const sku = row[0];
            if (!sku) continue;

            const desc = row[1] || '';
            const familia = row[2] || 'SIN CLASIFICAR'; // Linea -> Familia
            const subfamilia = row[3] || 'SIN CLASIFICAR'; // Sublinea -> Subfamilia
            const marca = row[4] || 'GENERICO';

            const litrosRaw = row[5];
            const litros = (litrosRaw !== undefined && litrosRaw !== null && !isNaN(parseFloat(litrosRaw))) ? parseFloat(litrosRaw) : 0;

            await pool.query(`
                INSERT INTO clasificacion_productos (sku, descripcion, marca, familia, subfamilia, litros)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (sku) 
                DO UPDATE SET 
                    descripcion = EXCLUDED.descripcion,
                    marca = EXCLUDED.marca,
                    familia = EXCLUDED.familia,
                    subfamilia = EXCLUDED.subfamilia,
                    litros = EXCLUDED.litros,
                    updated_at = NOW()
            `, [String(sku).trim(), String(desc).trim(), String(marca).trim(), String(familia).trim(), String(subfamilia).trim(), litros]);

            imported++;
            if (imported % 500 === 0) console.log(`   Procesados: ${imported}`);
        }

        console.log(`✅ Carga completada. Total importados/actualizados: ${imported}`);

    } catch (e) {
        console.error('❌ Error cargando maestro:', e);
    } finally {
        await pool.end();
    }
}

loadMaster();
