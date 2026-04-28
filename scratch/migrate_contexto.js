require('dotenv').config({ path: './backend/.env' });
const pool = require('../backend/src/db');

async function migrate() {
  try {
    console.log('Migrando base de datos para añadir columna "contexto"...');
    await pool.query('ALTER TABLE cliente ADD COLUMN IF NOT EXISTS contexto TEXT');
    console.log('✅ Columna "contexto" añadida con éxito.');
  } catch (err) {
    console.error('❌ Error en la migración:', err);
  } finally {
    process.exit();
  }
}

migrate();
