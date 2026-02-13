
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addIndices() {
    try {
        console.log('--- ADDING MISSING INDICES FOR SALES MODULE ---');

        const indices = [
            // Venta Table
            { name: 'idx_venta_fecha_emision', table: 'venta', columns: 'fecha_emision' },
            { name: 'idx_venta_sku', table: 'venta', columns: 'sku' },
            { name: 'idx_venta_vendedor_cliente', table: 'venta', columns: 'vendedor_cliente' },
            { name: 'idx_venta_vendedor_documento', table: 'venta', columns: 'vendedor_documento' },
            { name: 'idx_venta_identificador', table: 'venta', columns: 'identificador' }, // RUT cliente usually

            // Producto / Clasificacion
            { name: 'idx_clasificacion_sku', table: 'clasificacion_productos', columns: 'sku' },
            { name: 'idx_clasificacion_familia', table: 'clasificacion_productos', columns: 'familia' },
            { name: 'idx_clasificacion_subfamilia', table: 'clasificacion_productos', columns: 'subfamilia' },

            // Usuario (for joins by name/alias)
            { name: 'idx_usuario_nombre_vendedor_trgm', table: 'usuario', columns: 'UPPER(TRIM(nombre_vendedor))' }, // Functional index might fail if extension not enabled
            { name: 'idx_usuario_alias_trgm', table: 'usuario', columns: 'UPPER(TRIM(alias))' }
        ];

        for (const idx of indices) {
            console.log(`Checking/Creating index: ${idx.name} on ${idx.table}...`);
            try {
                // Simple index creation if not exists
                await pool.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (${idx.columns})`);
                console.log(`✅ Index ${idx.name} created/verified.`);
            } catch (err) {
                console.warn(`⚠️ Could not create index ${idx.name}: ${err.message}`);
                // Fallback for functional indices if standard creation fails (e.g. syntax)
                if (err.message.includes('syntax')) {
                    console.log('Skipping validation for complex expression index.');
                }
            }
        }

        console.log('--- INDICES UPDATE COMPLETE ---');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await pool.end();
    }
}

addIndices();
