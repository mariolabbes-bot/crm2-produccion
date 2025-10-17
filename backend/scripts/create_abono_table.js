require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function createAbonoTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando tabla abono...\n');

    // Crear tabla abono
    await client.query(`
      CREATE TABLE IF NOT EXISTS abono (
        id SERIAL PRIMARY KEY,
        vendedor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        fecha_abono DATE NOT NULL,
        monto DECIMAL(15, 2) NOT NULL,
        descripcion TEXT,
        folio VARCHAR(50),
        cliente_nombre VARCHAR(255),
        tipo_pago VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear índices para mejorar el rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_abono_vendedor_id ON abono(vendedor_id);
      CREATE INDEX IF NOT EXISTS idx_abono_fecha ON abono(fecha_abono);
      CREATE INDEX IF NOT EXISTS idx_abono_folio ON abono(folio);
    `);

    console.log('✅ Tabla abono creada exitosamente');
    console.log('✅ Índices creados');
    
    // Verificar la estructura
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'abono'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estructura de la tabla abono:');
    console.table(tableInfo.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAbonoTable();
