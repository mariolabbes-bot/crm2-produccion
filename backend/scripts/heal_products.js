const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });

(async () => {
    try {
        console.log("Conectando a DB para sanar 'Sin Nombre'...");

        // Count how many are 'Sin Nombre' currently
        const check = await pool.query(`SELECT COUNT(*) as count FROM producto WHERE descripcion = 'Sin Nombre'`);
        console.log(`Productos con 'Sin Nombre': ${check.rows[0].count}`);

        if (parseInt(check.rows[0].count) === 0) {
            console.log("No hay productos con 'Sin Nombre'. Saliendo.");
            return;
        }

        // Try to heal using the venta table which might have the correct desc
        const res = await pool.query(`
            UPDATE producto p
            SET descripcion = subquery.best_desc
            FROM (
                SELECT sku, MAX(descripcion) as best_desc
                FROM venta
                WHERE descripcion IS NOT NULL 
                  AND descripcion != 'Sin Nombre'
                  AND descripcion != 'Sin Descripcion'
                  AND descripcion != ''
                GROUP BY sku
            ) AS subquery
            WHERE p.sku = subquery.sku
              AND p.descripcion = 'Sin Nombre'
            RETURNING p.sku, p.descripcion;
        `);

        console.log(`✅ Se sanaron ${res.rowCount} descripciones usando el historial de ventas.`);

        // Count remaining
        const checkAfter = await pool.query(`SELECT COUNT(*) as count FROM producto WHERE descripcion = 'Sin Nombre'`);
        console.log(`⚠️ Productos que siguen con 'Sin Nombre' después del escaneo: ${checkAfter.rows[0].count}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        pool.end();
    }
})();
