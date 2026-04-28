
const pool = require('./src/db');

async function checkVendors() {
  try {
    console.log('--- USUARIOS (VENDEDORES) ---');
    const users = await pool.query("SELECT rut, nombre_vendedor, alias, rol_usuario FROM usuario WHERE rol_usuario IN ('VENDEDOR', 'MANAGER') ORDER BY nombre_vendedor");
    console.table(users.rows);

    console.log('\n--- TOTAL VENTAS POR VENDEDOR ---');
    const ventas = await pool.query(`
      SELECT vendedor_cliente, SUM(valor_total) as total
      FROM venta
      GROUP BY vendedor_cliente
      ORDER BY total DESC
    `);
    console.table(ventas.rows);

    console.log('\n--- TOTAL ABONOS POR VENDEDOR ---');
    const abonos = await pool.query(`
      SELECT vendedor_cliente, SUM(monto) as total
      FROM abono
      GROUP BY vendedor_cliente
      ORDER BY total DESC
    `);
    console.table(abonos.rows);

    // Get a combined view (this is likely what the dashboard shows)
    // Looking at previous conversations, it seems 'venta' and 'abono' are used.
    // Let's see how the dashboard calculates it.
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkVendors();
