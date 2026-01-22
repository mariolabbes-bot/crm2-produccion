
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

async function simulateCleanup() {
    const client = await pool.connect();
    try {
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

        // Get current DB user aliases
        const usersRes = await client.query("SELECT alias, nombre_vendedor FROM usuario");
        const aliasMap = new Map();
        usersRes.rows.forEach(u => {
            const alias = u.alias || u.nombre_vendedor;
            aliasMap.set((u.alias || '').toLowerCase().trim(), alias);
            aliasMap.set((u.nombre_vendedor || '').toLowerCase().trim(), alias);
        });

        const orphanedRes = await client.query(`
        SELECT DISTINCT t.nombre_vendedor 
        FROM cliente t
        LEFT JOIN usuario u ON (LOWER(t.nombre_vendedor) = LOWER(u.nombre_vendedor) OR LOWER(t.nombre_vendedor) = LOWER(u.alias))
        WHERE t.nombre_vendedor IS NOT NULL AND t.nombre_vendedor != '' AND u.rut IS NULL
    `);

        console.log('--- SIMULATION: CLEANING 23 ORPHANED NAMES ---');
        let resolvable = 0;
        let stillOrphan = 0;

        for (const r of orphanedRes.rows) {
            const raw = r.nombre_vendedor;
            const lower = raw.toLowerCase().trim();

            // 1. Check if in CSV Map
            let target = null;
            if (normalizationMap.has(lower)) {
                target = normalizationMap.get(lower);
            } else if (aliasMap.has(lower)) {
                target = aliasMap.get(lower);
            }

            if (target) {
                console.log(`✅ RESOLVED: "${raw}" -> "${target}"`);
                resolvable++;
            } else {
                console.log(`❌ STILL ORPHAN: "${raw}"`);
                stillOrphan++;
            }
        }

        console.log(`\nSummary: Resolvable: ${resolvable}, Still Orphan: ${stillOrphan}`);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

simulateCleanup();
