const pool = require('../src/db');
(async () => {
  try {
    const totales = await pool.query('SELECT SUM(valor_total) as total_ventas FROM venta WHERE valor_total IS NOT NULL');
    const abonosNeto = await pool.query('SELECT SUM(monto_neto) as total_abonos_neto FROM abono WHERE monto_neto IS NOT NULL');
    const abonosMonto = await pool.query('SELECT SUM(monto) as total_abonos_monto FROM abono WHERE monto IS NOT NULL');
    const cantVentas = await pool.query('SELECT COUNT(*) as cant_ventas FROM venta');
    const cantAbonos = await pool.query('SELECT COUNT(*) as cant_abonos FROM abono');
    const tv = parseFloat(totales.rows[0].total_ventas || 0);
    const ta_neto = parseFloat(abonosNeto.rows[0].total_abonos_neto || 0);
    const ta_monto = parseFloat(abonosMonto.rows[0].total_abonos_monto || 0);
    const pct_neto = ((ta_neto / tv) * 100).toFixed(2);
    const pct_monto = ((ta_monto / tv) * 100).toFixed(2);
    const saldo = (tv - ta_neto).toFixed(2);
    console.log('💰 TOTALES:');
    console.log(`Total VENTAS (valor_total): $${tv.toLocaleString()}`);
    console.log(`Total ABONOS (monto): $${ta_monto.toLocaleString()}`);
    console.log(`Total ABONOS (monto_neto): $${ta_neto.toLocaleString()}`);
    console.log(`\n%Cobrado (con monto_neto): ${pct_neto}%`);
    console.log(`%Cobrado (con monto): ${pct_monto}%`);
    console.log(`Saldo Pendiente: $${parseFloat(saldo).toLocaleString()}`);
    console.log(`\nCantidad Ventas: ${cantVentas.rows[0].cant_ventas}`);
    console.log(`Cantidad Abonos: ${cantAbonos.rows[0].cant_abonos}`);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
