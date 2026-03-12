const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

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
                c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad, c.circuito, c.fecha_ultima_visita, c.frecuencia_visita,
                COALESCE(cd.deuda_total, 0) as deuda_total,
                COALESCE(cd.max_dias_mora, 0) as dias_mora,
                COALESCE(cs.prom_ventas, 0) as prom_ventas,
                COALESCE(cs.meses_con_venta, 0) as meses_con_venta
            FROM cliente c
            LEFT JOIN client_sales cs ON c.rut = cs.rut
            LEFT JOIN client_debt cd ON c.rut = cd.rut
            LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
            WHERE ($1::text IS NULL OR $1 = '' OR u.rut = $1) AND c.es_terreno = true
        )
        SELECT * FROM stats LIMIT 1
`;

async function run() {
    try {
        console.log('Running heatmap query...');
        const res = await pool.query(query, [null]);
        console.log('✅ Result:', res.rows.length);
    } catch (err) {
        console.error('❌ SQL ERROR:', err.message);
        console.error('❌ STACK:', err.stack);
    } finally {
        process.exit(0);
    }
}

run();
