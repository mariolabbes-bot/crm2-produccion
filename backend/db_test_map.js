const pool = require('./src/db');
async function test() {
  const res = await pool.query("SELECT rut, nombre, latitud, longitud, circuito FROM cliente WHERE latitud IS NOT NULL LIMIT 5");
  console.log(res.rows);
  pool.end();
}
test();
