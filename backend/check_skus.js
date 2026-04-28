const pool = require('./src/db');
async function check() {
  try {
    const stock = await pool.query('SELECT sku, sucursal, cantidad FROM stock LIMIT 5');
    console.log('Stock sample:', stock.rows);
    
    const venta = await pool.query('SELECT sku, cantidad FROM venta WHERE sku IS NOT NULL LIMIT 5');
    console.log('Venta sample:', venta.rows);

    const stockCount = await pool.query('SELECT COUNT(*) FROM stock');
    console.log('Stock count:', stockCount.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
