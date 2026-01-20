require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyMapping() {
    try {
        console.log('--- APLICANDO MAPEO DE VENDEDORES (BRIDGE STRATEGY) ---');
        const filePath = path.join(__dirname, '../outputs/mapeo_vendedores.csv');
        const content = fs.readFileSync(filePath, 'utf8');

        // Parse CSV
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('---')) continue;

            const cols = line.split(';');
            if (cols.length < 4) continue;

            const realRut = cols[0].trim();
            const infoName = cols[1].trim();
            const targetAlias = cols[3].trim();

            if (!realRut || !targetAlias) continue;
            if (realRut.startsWith('STUB')) continue;

            console.log(`\n🔹 Processing: ${infoName} (${realRut}) -> Target: "${targetAlias}"`);

            // 1. Check who currently holds this alias
            const currentHolderRes = await pool.query(
                "SELECT rut, nombre_vendedor, alias FROM usuario WHERE alias = $1",
                [targetAlias]
            );

            if (currentHolderRes.rows.length === 0) {
                console.log(`   - Alias "${targetAlias}" is free. Assigning...`);
                await pool.query("UPDATE usuario SET alias = $1 WHERE rut = $2", [targetAlias, realRut]);
                console.log("   ✅ Assigned.");
                continue;
            }

            const holder = currentHolderRes.rows[0];
            if (holder.rut === realRut) {
                console.log("   - Already assigned correctly.");
                continue;
            }

            // 2. STUB/OTHER holds it. Use BRIDGE strategy.
            console.log(`   - Alias held by: ${holder.nombre_vendedor}. Init Bridge Strategy...`);

            const BRIDGE_ALIAS = `${targetAlias}_TEMP_${Date.now()}`;
            const BRIDGE_RUT = `BRIDGE-${Date.now()}`;

            // A. Create Bridge User
            await pool.query(`
            INSERT INTO usuario (rut, nombre_vendedor, alias, rol_usuario, correo, password, nombre_completo, cargo, local)
            VALUES ($1, 'Bridge User', $2, 'BRIDGE', 'bridge@temp.local', 'temp', 'Bridge', 'Temp', 'Temp')
        `, [BRIDGE_RUT, BRIDGE_ALIAS]);

            // B. Move Sales from Holder ('Luis') to Bridge ('Luis_TEMP')
            // This satisfies FK because Bridge user exists with that alias?
            // Wait, FK on venta points to alias.
            // So we update venta SET vendedor_documento = 'Luis_TEMP'.
            const moveSales = await pool.query(
                "UPDATE venta SET vendedor_documento = $1 WHERE vendedor_documento = $2",
                [BRIDGE_ALIAS, targetAlias]
            );
            console.log(`   - Moved ${moveSales.rowCount} sales to Bridge.`);

            // C. Rename Holder's Alias (Free up 'Luis')
            // Now Holder has 0 refs, so we can change its alias.
            const OLD_ALIAS = `${targetAlias}_OLD`;
            await pool.query("UPDATE usuario SET alias = $1 WHERE rut = $2", [OLD_ALIAS, holder.rut]);
            console.log(`   - Renamed Stub to ${OLD_ALIAS}.`);

            // D. Assign 'Luis' to Real User
            await pool.query("UPDATE usuario SET alias = $1 WHERE rut = $2", [targetAlias, realRut]);
            console.log(`   - Assigned ${targetAlias} to Real User.`);

            // E. Move Sales BACK from Bridge ('Luis_TEMP') to Real User ('Luis')
            await pool.query(
                "UPDATE venta SET vendedor_documento = $1 WHERE vendedor_documento = $2",
                [targetAlias, BRIDGE_ALIAS]
            );
            console.log("   - Sales moved to Real User.");

            // F. Apply display text update just in case
            await pool.query("UPDATE venta SET vendedor_cliente = $1 WHERE vendedor_cliente = $2", [targetAlias, BRIDGE_ALIAS]);

            // G. Clean up Bridge
            await pool.query("DELETE FROM usuario WHERE rut = $1", [BRIDGE_RUT]);
            console.log("   ✅ Bridge removed. SWAP COMPLETE.");
        }

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        await pool.end();
    }
}

applyMapping();
