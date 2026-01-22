
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

async function applyCleanup() {
    const client = await pool.connect();
    try {
        // 1. Load Maestro CSV
        const mapPath = path.join(__dirname, '../outputs/mapeo_vendedores.csv');
        const normalizationMap = new Map();
        if (fs.existsSync(mapPath)) {
            const csvData = fs.readFileSync(mapPath, 'utf8');
            const lines = csvData.split(/\r?\n/);
            lines.forEach((line, idx) => {
                if (!line.trim() || idx === 0) return;
                const cols = line.split(';');
                if (cols.length >= 4) {
                    const original = cols[1]; // NOMBRE_USUARIO_LOGIN
                    const target = cols[3];   // ASIGNAR_NOMBRE_VENTAS_EXACTO
                    if (original && target) {
                        normalizationMap.set(original.toLowerCase().trim(), target.trim());
                        if (original.includes('ñ')) {
                            const bad = original.replace(/ñ/g, '√±');
                            normalizationMap.set(bad.toLowerCase().trim(), target.trim());
                        }
                    }
                }
            });
        }

        // 2. Add Manual Rules (Milton)
        normalizationMap.set("milton   marin blanco", "MILTON");
        normalizationMap.set("milton marin blanco", "MILTON");

        // 3. Get Orphaned Names in Cliente
        const orphanedRes = await client.query(`
        SELECT DISTINCT t.nombre_vendedor 
        FROM cliente t
        LEFT JOIN usuario u ON (LOWER(t.nombre_vendedor) = LOWER(u.nombre_vendedor) OR LOWER(t.nombre_vendedor) = LOWER(u.alias))
        WHERE t.nombre_vendedor IS NOT NULL AND t.nombre_vendedor != '' AND u.rut IS NULL
    `);

        console.log(`🚀 Iniciando limpieza de ${orphanedRes.rowCount} nombres huérfanos...`);

        let updatedTotal = 0;

        for (const r of orphanedRes.rows) {
            const raw = r.nombre_vendedor;
            const lower = raw.toLowerCase().trim();

            if (normalizationMap.has(lower)) {
                const target = normalizationMap.get(lower);
                const updateRes = await client.query(
                    "UPDATE cliente SET nombre_vendedor = $1 WHERE nombre_vendedor = $2",
                    [target, raw]
                );
                console.log(`✅ ACTUALIZADO: "${raw}" -> "${target}" (${updateRes.rowCount} registros)`);
                updatedTotal += updateRes.rowCount;
            } else {
                console.log(`⏳ SALTADO (No corregible): "${raw}"`);
            }
        }

        console.log(`\n🎉 Limpieza finalizada. Total registros actualizados: ${updatedTotal}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

applyCleanup();
