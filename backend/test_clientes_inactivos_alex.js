// Script para listar clientes de Alex con ventas en los últimos 12 meses pero sin ventas en el mes actual
const pool = require('./src/db');

(async () => {
  const alias = 'Alex'; // OJO: sensible a mayúsculas/minúsculas
  const desde = '2024-10-01';
  const hasta = '2025-10-01';
  const mesActualIni = '2025-10-01';
  const mesActualFin = '2025-10-31';

  // Clientes con ventas de Alex en últimos 12 meses
  const clientes = await pool.query(`
    SELECT DISTINCT v.cliente
    FROM venta v
    WHERE v.vendedor_cliente = $1
      AND v.fecha_emision >= $2 AND v.fecha_emision < $3
  `, [alias, desde, hasta]);

  const resultados = [];
  for (const row of clientes.rows) {
    // ¿Tiene ventas en el mes actual?
    const ventasMesActual = await pool.query(`
      SELECT 1 FROM venta v
      WHERE v.cliente = $1 AND v.vendedor_cliente = $2
        AND v.fecha_emision >= $3 AND v.fecha_emision <= $4
      LIMIT 1
    `, [row.cliente, alias, mesActualIni, mesActualFin]);
    if (ventasMesActual.rows.length === 0) {
      resultados.push(row.cliente);
    }
  }
  console.log('Clientes de Alex con ventas en últimos 12 meses pero sin ventas en el mes actual:');
  console.log(resultados);
  await pool.end();
})();
