
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

async function exportOrphans() {
    const client = await pool.connect();
    try {
        console.log('📊 Generando reporte de clientes huérfanos...');

        // 1. Get the list of orphaned names again to be precise
        const orphansQuery = `
        SELECT DISTINCT t.nombre_vendedor 
        FROM cliente t
        LEFT JOIN usuario u ON (LOWER(t.nombre_vendedor) = LOWER(u.nombre_vendedor) OR LOWER(t.nombre_vendedor) = LOWER(u.alias))
        WHERE t.nombre_vendedor IS NOT NULL AND t.nombre_vendedor != '' AND u.rut IS NULL
    `;
        const orphansRes = await client.query(orphansQuery);
        const orphanNames = orphansRes.rows.map(r => r.nombre_vendedor);

        if (orphanNames.length === 0) {
            console.log('✅ No se encontraron huérfanos.');
            return;
        }

        // 2. Fetch full client records for these vendors
        const detailsQuery = `
        SELECT rut, nombre, email, telefono_principal, sucursal, categoria, nombre_vendedor as vendedor_actual
        FROM cliente
        WHERE nombre_vendedor ANY ($1)
    `;
        // PostgreSQL ANY needs an array format
        const detailsRes = await client.query(`
        SELECT rut, nombre, email, telefono_principal, sucursal, categoria, nombre_vendedor as vendedor_actual
        FROM cliente
        WHERE nombre_vendedor IN (${orphanNames.map((_, i) => `$${i + 1}`).join(', ')})
    `, orphanNames);

        console.log(`📈 Encontrados ${detailsRes.rowCount} registros totales para los ${orphanNames.length} nombres huérfanos.`);

        // 3. Create Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(detailsRes.rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes Huérfanos');

        const outputPath = path.join(__dirname, '../outputs/REPORTE_HUERFANOS_VENDEDORES.xlsx');
        const outDir = path.dirname(outputPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        XLSX.writeFile(wb, outputPath);
        console.log(`✅ Archivo creado en: ${outputPath}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

exportOrphans();
