require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function linkUsers() {
    try {
        console.log('--- LINKING USERS TO ALIASES ---');

        // 0. CLEAR ALIASES FROM STUBS - SKIPPED to avoid FK issues.
        // The loop below handles reassigning aliases safely via renaming.
        // console.log('🧹 Clearing aliases from STUB users...');
        // await pool.query("UPDATE usuario SET alias = NULL WHERE rut LIKE 'STUB%'");

        // 1. Get Stubs (Short Names we want to assign as aliases)
        const stubsRes = await pool.query("SELECT nombre_vendedor FROM usuario WHERE rut LIKE 'STUB%'");
        const stubs = new Set(stubsRes.rows.map(r => r.nombre_vendedor.toLowerCase()));

        // 2. Get Real Users (No Alias)
        const realUsersRes = await pool.query("SELECT nombre_vendedor, rut FROM usuario WHERE rut NOT LIKE 'STUB%'");

        for (const u of realUsersRes.rows) {
            if (!u.nombre_vendedor) {
                console.log(`⚠️ User with RUT ${u.rut} has no nombre_vendedor. Skipping.`);
                continue;
            }

            // Simple Heuristic: First Word
            // "Milton Marin Blanco" -> "milton"
            const firstWord = u.nombre_vendedor.trim().split(/\s+/)[0].toLowerCase();

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
                    // Primero, eliminamos el alias del STUB para liberar el UNIQUE constraint
                    // Como tenemos ON DELETE SET NULL / ON UPDATE CASCADE en la FK, esto es seguro.
                    // Pero espera, si hacemos UPDATE al STUB a NULL, las ventas quedan huérfanas (NULL) si no era CASCADE.
                    // La FK es ON UPDATE CASCADE. Si cambiamos el alias del STUB, las ventas se actualizan.
                    // Pero queremos que las ventas pasen al usuario REAL.
                    // El usuario Real tendrá el MISMO alias string.
                    // Pasos:
                    // 1. Encontrar el STUB que tiene ese alias currently.
                    // 2. Cambiar el alias del STUB a algo temporal o NULL?
                    //    Si lo cambiamos a NULL, las ventas del STUB (vendedor_documento) se ponen en NULL (porque pusimos ON DELETE SET NULL? No, ON UPDATE CASCADE... ah, si ponemos NULL el update cascade pone NULL).
                    //    Si queremos conservar las ventas, no debemos poner NULL, debemos reasignarlas.
                    //    MEJOR: Update ventas WHERE vendedor_documento = 'Alias' SET vendedor_documento = NULL (o algo)
                    //    O simplemente: Asignar el Alias al Real User fallará si ya existe en el Stub (Unique constraint en usuario.alias).

                    // Estrategia Correcta con la nueva FK:
                    // 1. Update usuario SET alias = 'TEMP_' + alias WHERE alias = alias (El Stub se renombra, ventas se actualizan a TEMP_...)
                    // 2. Update usuario SET alias = alias WHERE rut = u.rut (El Real toma el alias limpio)
                    // 3. Update venta SET vendedor_documento = alias WHERE vendedor_documento = 'TEMP_' + alias (Las ventas vuelven al alias original, que ahora apunta al Real, o simplemente se quedan con el string correcto).
                    //    Wait, vendedor_documento es un STRING que reference usuario(alias).
                    //    Si el Real User ahora tiene el alias 'Alex', y la venta tiene 'TEMP_Alex', la venta apunta al Stub 'TEMP_Alex'.
                    //    Hacemos Update venta ... SET ... 'Alex'. Como 'Alex' existe (es el Real), la FK se satisface.

                    await pool.query("BEGIN");

                    // 1. Renombrar alias del Stub (si existe) para liberar el nombre
                    //    Usamos una query que busque por el alias exacto
                    const stubRes = await pool.query("SELECT rut FROM usuario WHERE alias = $1 AND rut LIKE 'STUB%'", [alias]);
                    if (stubRes.rows.length > 0) {
                        const tempAlias = `TEMP_${alias}`;
                        await pool.query("UPDATE usuario SET alias = $1 WHERE alias = $2", [tempAlias, alias]);

                        // 2. Asignar el alias al usuario Real
                        await pool.query("UPDATE usuario SET alias = $1 WHERE rut = $2", [alias, u.rut]);

                        // 3. Mover las ventas que quedaron apuntando al TEMP alias hacia el alias correcto (que ahora es el Real)
                        //    Aunque en realidad, queremos que el historial de esas ventas pertenezca al usuario Real.
                        //    Al mover el alias del Stub a TEMP, las ventas se movieron a TEMP (por CASCADE).
                        //    Ahora las movemos de vuelta a 'Alex'.
                        await pool.query("UPDATE venta SET vendedor_documento = $1 WHERE vendedor_documento = $2", [alias, tempAlias]);

                        // 4. (Opcional) Dejar el Stub sin alias o borrarlo si ya no sirve
                        await pool.query("UPDATE usuario SET alias = NULL WHERE alias = $1", [tempAlias]);
                    } else {
                        // Si no hay stub ocupando el alias, solo asignamos (ej. primera vez o ya estaba libre)
                        await pool.query("UPDATE usuario SET alias = $1 WHERE rut = $2", [alias, u.rut]);
                    }

                    await pool.query("COMMIT");

                } catch (e) {
                    await pool.query("ROLLBACK");
                    console.error(`Error linking ${u.rut}: ${e.message}`);
                }

            } else {
                // console.log(`⚠️ No match found for "${u.nombre_vendedor}" (First word: ${firstWord})`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

linkUsers();
