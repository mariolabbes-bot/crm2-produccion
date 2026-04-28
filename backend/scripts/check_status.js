const pool = require('../src/db');

async function check() {
    try {
        console.log("=== ESTADO ACTUAL DE VENDEDORES ===");
        const res = await pool.query(`
            SELECT rut, nombre_vendedor, alias, rol_usuario
            FROM usuario
            WHERE LOWER(rol_usuario) = 'vendedor' 
               OR alias IS NOT NULL
            ORDER BY nombre_vendedor
        `);
        console.table(res.rows);

        const dupAlias = await pool.query(`
            SELECT alias, COUNT(*) 
            FROM usuario 
            WHERE alias IS NOT NULL 
            GROUP BY alias 
            HAVING COUNT(*) > 1
        `);
        console.log("\nDuplicados por Alias:", dupAlias.rows.length === 0 ? "Ninguno ✅" : dupAlias.rows);

        const nullAlias = await pool.query(`
            SELECT COUNT(*) 
            FROM usuario 
            WHERE LOWER(rol_usuario) = 'vendedor' AND alias IS NULL
        `);
        console.log(`Vendedores sin alias configurado: ${nullAlias.rows[0].count}`);

    } finally {
        await pool.end();
    }
}

check();
