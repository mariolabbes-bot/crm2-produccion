const pool = require('./src/db');

(async () => {
  try {
    const alias = 'Alex';
    const desde = '2024-10-01';
    const hasta = '2025-10-01';
    const mesFin = '2025-10-31';

    const base = `WITH ventas_clientes AS (
      SELECT c.rut, c.nombre,
        COALESCE(SUM(v.valor_total),0) as monto_total,
        COUNT(DISTINCT v.folio) as num_ventas,
        MODE() WITHIN GROUP (ORDER BY v.vendedor_id) as vendedor_id_principal,
        MIN(LOWER(v.vendedor_cliente)) as vendedor_cliente_lower
      FROM cliente c
      INNER JOIN venta v ON v.cliente = c.nombre
        AND v.fecha_emision >= $1 AND v.fecha_emision < $2
      WHERE NOT EXISTS (
        SELECT 1 FROM venta v2
        WHERE v2.cliente = c.nombre
          AND v2.fecha_emision >= $2 AND v2.fecha_emision <= $3
      )
      GROUP BY c.rut, c.nombre
    )`;

    const qCount = base + ` SELECT count(*) as cnt FROM ventas_clientes vc WHERE EXISTS (
      SELECT 1 FROM venta v WHERE v.cliente = vc.nombre AND LOWER(v.vendedor_cliente) = LOWER($4) AND v.fecha_emision >= $1 AND v.fecha_emision < $2
    );`;

    const qSample = base + ` SELECT vc.nombre, vc.monto_total FROM ventas_clientes vc WHERE EXISTS (
      SELECT 1 FROM venta v WHERE v.cliente = vc.nombre AND LOWER(v.vendedor_cliente) = LOWER($4) AND v.fecha_emision >= $1 AND v.fecha_emision < $2
    ) ORDER BY vc.monto_total DESC LIMIT 10;`;

    const rCount = await pool.query(qCount, [desde, hasta, mesFin, alias]);
    const rSample = await pool.query(qSample, [desde, hasta, mesFin, alias]);
    console.log('Count:', rCount.rows[0].cnt);
    console.log('Sample top 10:', rSample.rows.map(r => r.nombre));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
