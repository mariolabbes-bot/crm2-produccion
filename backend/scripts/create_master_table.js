require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createTable() {
    try {
        console.log('--- CREANDO TABLA MAESTRA ---');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS clasificacion_productos (
        sku VARCHAR(255) PRIMARY KEY,
        descripcion TEXT,
        marca VARCHAR(255),
        familia VARCHAR(255),
        subfamilia VARCHAR(255),
        litros NUMERIC DEFAULT 0,
        origen VARCHAR(50) DEFAULT 'MAESTRO_EXCEL',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Indexs for faster joins
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cp_familia ON clasificacion_productos(familia);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cp_subfamilia ON clasificacion_productos(subfamilia);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cp_marca ON clasificacion_productos(marca);`);

        console.log('✅ Tabla clasificacion_productos creada/verificada.');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await pool.end();
    }
}

createTable();
