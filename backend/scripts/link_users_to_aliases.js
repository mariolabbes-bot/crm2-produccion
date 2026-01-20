require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function linkUsers() {
    try {
        console.log('--- LINKING USERS TO ALIASES ---');

        // 0. CLEAR ALIASES FROM STUBS to avoid Unique Constraint
        // We only want aliases on REAL users so they match the "Short Name" in sales.
        console.log('🧹 Clearing aliases from STUB users...');
        await pool.query("UPDATE usuario SET alias = NULL WHERE rut LIKE 'STUB%'");

        // 1. Get Stubs (Short Names we want to assign as aliases)
        const stubsRes = await pool.query("SELECT nombre_vendedor FROM usuario WHERE rut LIKE 'STUB%'");
        const stubs = new Set(stubsRes.rows.map(r => r.nombre_vendedor.toLowerCase()));

        // 2. Get Real Users (No Alias)
        const realUsersRes = await pool.query("SELECT nombre_vendedor, rut FROM usuario WHERE rut NOT LIKE 'STUB%'");

        for (const u of realUsersRes.rows) {
            // Simple Heuristic: First Word
            // "Milton Marin Blanco" -> "milton"
            const firstWord = u.nombre_vendedor.split(' ')[0].toLowerCase();

            // Check exact match with a known stub name
            let match = null;
            if (stubs.has(firstWord)) {
                match = Array.from(stubs).find(s => s === firstWord);
            }

            if (match) {
                // Capitalize for alias
                const alias = match.charAt(0).toUpperCase() + match.slice(1);
                console.log(`✅ Linking "${u.nombre_vendedor}" -> Alias: "${alias}"`);

                try {
                    await pool.query("UPDATE usuario SET alias = $1 WHERE rut = $2", [alias, u.rut]);
                } catch (e) {
                    console.error(`Error updating ${u.rut}: ${e.message}`);
                }

            } else {
                console.log(`⚠️ No match found for "${u.nombre_vendedor}" (First word: ${firstWord})`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

linkUsers();
