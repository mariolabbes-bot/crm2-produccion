const { Pool } = require('pg');
require('dotenv').config({ path: `${__dirname}/../.env` });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runAnalysis() {
    try {
        const usersRes = await pool.query(`
            SELECT id, rut, nombre_vendedor, alias, rol_usuario
            FROM usuario
            WHERE LOWER(rol_usuario) IN ('vendedor', 'manager') AND nombre_vendedor IS NOT NULL
            ORDER BY nombre_vendedor
        `);

        console.log("| RUT | Nombre Oficial | Alias | Clientes Asignados (ID O RUT) | Ventas Cruzadas por Nombre/Alias | Casos Saldo (Deuda) cruzada por Nombre/Alias |");
        console.log("|---|---|---|---|---|---|");

        for (const user of usersRes.rows) {
            const clientCountRes = await pool.query(`
                SELECT COUNT(*) as count 
                FROM cliente 
                WHERE vendedor_id::text = $1 OR vendedor_id::text = $2
            `, [user.id, user.rut]);
            const clientCount = clientCountRes.rows[0].count;

            const salesRes = await pool.query(`
                SELECT COUNT(*) as count, MIN(vendedor_cliente) as nombre_ejemplo
                FROM venta 
                WHERE UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($1))
                   OR (UPPER(TRIM(vendedor_documento)) = UPPER(TRIM($2)) AND $2 IS NOT NULL AND $2 != '')
            `, [user.nombre_vendedor, user.alias]);
            const salesCount = salesRes.rows[0].count;
            const salesExample = salesRes.rows[0].nombre_ejemplo || 'N/A';

            const saldoRes = await pool.query(`
                SELECT COUNT(*) as count 
                FROM saldo_credito 
                WHERE UPPER(TRIM(nombre_vendedor)) = UPPER(TRIM($1))
                   OR (UPPER(TRIM(nombre_vendedor)) = UPPER(TRIM($2)) AND $2 IS NOT NULL AND $2 != '')
            `, [user.nombre_vendedor, user.alias]);
            const saldoCount = saldoRes.rows[0].count;

            console.log(`| ${user.rut} | ${user.nombre_vendedor} | ${user.alias || '*Sin alias*'} | **${clientCount}** | **${salesCount}** (Ej: ${salesExample}) | **${saldoCount}** |`);
        }

        console.log("\n## ⚠️ Vendedores Huérfanos en tabla 'Venta' (Sin usuario asignado)\n");
        console.log("| Nombre en Factura (Vendedor Cliente) | Cantidad de Ventas |");
        console.log("|---|---|");
        
        const orphanedSales = await pool.query(`
            SELECT TRIM(vendedor_cliente) as nombre, COUNT(*) as count
            FROM venta v
            WHERE NOT EXISTS (
                SELECT 1 FROM usuario u
                WHERE UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
                   OR UPPER(TRIM(u.alias)) = UPPER(TRIM(v.vendedor_cliente))
            ) AND vendedor_cliente IS NOT NULL AND TRIM(vendedor_cliente) != ''
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 15
        `);

        for (const row of orphanedSales.rows) {
            console.log(`| ${row.nombre} | ${row.count} |`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

runAnalysis();
