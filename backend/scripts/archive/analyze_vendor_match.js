require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function analyzeMatches() {
    try {
        console.log('--- ANALISIS DE COINCIDENCIA VENDEDORES (VENTA vs USUARIO) ---');

        // 1. Obtener valores únicos en VENTA (lo que hay en los documentos)
        console.log('\n[VENTA] Top 20 valores en columna vendedor_cliente:');
        const ventasQ = `
        SELECT vendedor_cliente, COUNT(*) as total_ventas
        FROM venta
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 20;
    `;
        const ventasRes = await pool.query(ventasQ);
        console.table(ventasRes.rows);

        // 2. Obtener valores únicos en USUARIO (quienes se loguean)
        console.log('\n[USUARIO] Top 20 vendedores registrados:');
        const userQ = `
        SELECT nombre_vendedor, alias, rut
        FROM usuario
        WHERE LOWER(rol_usuario) = 'vendedor'
        ORDER BY nombre_vendedor
        LIMIT 20;
    `;
        const userRes = await pool.query(userQ);
        console.table(userRes.rows);

        // 3. CROSS CHECK: ¿Cuántas ventas tienen "Huérfanas" (sin match)?
        console.log('\n[ANALISIS] Ventas sin match exacto (UPPER CASE):');
        const missQ = `
        SELECT 
            v.vendedor_cliente as en_venta,
            COUNT(*) as cantidad_sin_match
        FROM venta v
        LEFT JOIN usuario u ON UPPER(TRIM(v.vendedor_cliente)) = UPPER(TRIM(u.nombre_vendedor))
        WHERE u.rut IS NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 20;
    `;
        const missRes = await pool.query(missQ);

        if (missRes.rows.length === 0) {
            console.log('✅ EXCELENTE: Todas las ventas coinciden con un usuario.');
        } else {
            console.log('❌ ALERTA: Ventas que NO se están viendo en el dashboard:');
            console.table(missRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyzeMatches();
