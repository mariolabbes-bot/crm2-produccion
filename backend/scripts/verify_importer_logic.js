
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
    const client = await pool.connect();
    try {
        console.log('🔵 Loading DB Users (Aliases)...');
        const usersRes = await client.query("SELECT alias, nombre_vendedor FROM usuario");
        const aliasMap = new Map();
        usersRes.rows.forEach(u => {
            const fullName = u.nombre_vendedor;
            if (u.alias) aliasMap.set(u.alias.toLowerCase().trim(), fullName);
            if (u.nombre_vendedor) aliasMap.set(u.nombre_vendedor.toLowerCase().trim(), fullName);
        });

        console.log(`✅ Loaded ${aliasMap.size} alias/name entries from DB.`);

        // Load CSV Map
        const mapPath = path.join(__dirname, '../outputs/mapeo_vendedores.csv');
        const normalizationMap = new Map();
        if (fs.existsSync(mapPath)) {
            console.log('🔵 Loading normalization CSV...');
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
                        // Heuristic: If original has 'ñ', also add the '√±' version just in case
                        if (original.includes('ñ')) {
                            const bad = original.replace(/ñ/g, '√±');
                            normalizationMap.set(bad.toLowerCase().trim(), target.trim());
                        }
                    }
                }
            });
            console.log(`✅ Loaded ${normalizationMap.size} normalization rules.`);
        } else {
            console.error('❌ Mapeo CSV not found!');
            return;
        }

        // Load Excel
        const filePath = path.join(__dirname, '../bulk_data/CLIENTES_19-01-2026.xlsx');
        console.log(`🔵 Analyzing Excel: ${path.basename(filePath)}`);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const missingWithoutMap = new Set();
        const resolvedWithMap = new Set();
        const stillMissing = new Set();

        data.forEach(row => {
            const rawV = row['NombreVendedor']; // Known column
            if (!rawV) return;
            const s = String(rawV).trim();
            const lowerS = s.toLowerCase();

            // 1. Check direct match (Old logic simulation)
            let resolvedOld = aliasMap.has(lowerS);
            if (!resolvedOld) missingWithoutMap.add(s);

            // 2. Check Logic with Map (New Logic simulation)
            let normalizedS = lowerS;
            // Apply Normalization
            if (normalizationMap.has(lowerS)) {
                normalizedS = normalizationMap.get(lowerS).toLowerCase();
            }

            const resolvedNew = aliasMap.has(normalizedS);

            if (!resolvedOld && resolvedNew) {
                resolvedWithMap.add(`${s} -> ${aliasMap.get(normalizedS)}`);
            } else if (!resolvedNew) {
                // Still missing after map?
                stillMissing.add(s);
            }
        });

        console.log('\n--- RESULTS ---');
        console.log(`🔹 Vendors missing BEFORE mapping: ${missingWithoutMap.size}`);
        console.log(`🔹 Vendors resolved BY mapping: ${resolvedWithMap.size}`);
        console.log(`🔹 Vendors STILL missing: ${stillMissing.size}`);

        if (resolvedWithMap.size > 0) {
            console.log('\n✅ Examples of Successful Resolution:');
            console.log(Array.from(resolvedWithMap).slice(0, 10));
        }

        if (stillMissing.size > 0) {
            console.log('\n❌ Examples of Unresolved Vendors:');
            console.log(Array.from(stillMissing).slice(0, 10));
        } else {
            console.log('\n🎉 ALL VENDORS RESOLVED! Safe to import.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

verify();
