const pool = require('./src/db');
async function verifyHeatmap() {
    try {
        const vendedorId = 11;
        const query = `
            WITH stats AS (
                SELECT 
                    c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad,
                    c.last_visit_date, c.circuito,
                    COALESCE(SUM(sc.saldo_factura), 0) as deuda_total,
                    (SELECT COALESCE(SUM(v.valor_total), 0) / 3.0 
                     FROM venta v WHERE v.vendedor_cliente = u.nombre_vendedor 
                     AND v.fecha_emision >= NOW() - INTERVAL '3 months') as prom_ventas
                FROM cliente c
                LEFT JOIN usuario u ON c.vendedor_id = u.id
                LEFT JOIN saldo_credito sc ON c.rut = sc.rut
                WHERE c.vendedor_id = $1 AND c.latitud IS NOT NULL
                GROUP BY c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad, c.last_visit_date, c.circuito, u.nombre_vendedor
            )
            SELECT * FROM stats
        `;
        const result = await pool.query(query, [vendedorId]);
        console.log(`Found ${result.rows.length} clients for heatmap.`);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verifyHeatmap();
