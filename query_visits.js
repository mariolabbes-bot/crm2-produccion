require('dotenv').config({ path: 'backend/.env' });
const pool = require('./backend/src/db');

async function check() {
  const res = await pool.query("SELECT id, vendedor_id, cliente_rut, estado, hora_inicio, fecha FROM visitas_registro WHERE estado = 'en_progreso'");
  console.log("Visitas Activas:", JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
