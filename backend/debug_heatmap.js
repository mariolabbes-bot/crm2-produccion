const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function testHeatmap() {
    try {
        console.log('Testing heatmap query...');
        const vendedorId = null; // Test ALL
        const query = `
            WITH client_sales AS (
                SELECT 
                    identificador AS rut,
                    COALESCE(SUM(valor_total) / 12.0, 0) as prom_ventas,
                    COUNT(DISTINCT TO_CHAR(fecha_emision, 'YYYY-MM')) as meses_con_venta
                FROM venta
                WHERE fecha_emision >= NOW() - INTERVAL '12 months'
                GROUP BY identificador
            ),
            client_debt AS (
                SELECT
                    rut,
                    COALESCE(SUM(saldo_factura), 0) as deuda_total,
                    MAX(CURRENT_DATE - fecha_emision) as max_dias_mora
                FROM saldo_credito
                GROUP BY rut
            ),
            stats AS (
                SELECT 
                    c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad, c.circuito,
                    COALESCE(cd.deuda_total, 0) as deuda_total,
                    COALESCE(cd.max_dias_mora, 0) as dias_mora,
                    COALESCE(cs.prom_ventas, 0) as prom_ventas,
                    COALESCE(cs.meses_con_venta, 0) as meses_con_venta
                FROM cliente c
                LEFT JOIN client_sales cs ON c.rut = cs.rut
                LEFT JOIN client_debt cd ON c.rut = cd.rut
                LEFT JOIN usuario u ON c.vendedor_id = u.id
                WHERE ($1::text IS NULL OR $1 = '' OR u.rut = $1) AND c.es_terreno = true
            )
            SELECT * FROM stats
        `;
        const result = await pool.query(query, [vendedorId]);
        console.log('Success! Count:', result.rows.length);
    } catch (err) {
        console.error('SQL ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

testHeatmap();
