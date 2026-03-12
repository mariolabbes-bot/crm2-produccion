const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Intentar cargar .env desde el directorio de ejecución y el directorio del script
require('dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
}

const connStr = process.env.DATABASE_URL;
if (!connStr) {
    console.error('❌ DATABASE_URL no encontrada. Verifique la ubicación del archivo .env');
    console.log('CWD:', process.cwd());
    process.exit(1);
}

const pool = new Pool({
    connectionString: connStr,
    ssl: connStr.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando migración de cliente...');
        const sql = `
      ALTER TABLE cliente ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE;
      ALTER TABLE cliente ADD COLUMN IF NOT EXISTS frecuencia_visita INTEGER DEFAULT 30;
      COMMENT ON COLUMN cliente.fecha_ultima_visita IS 'Fecha del último check-out exitoso de visita';
      COMMENT ON COLUMN cliente.frecuencia_visita IS 'Frecuencia sugerida de visita en días';
    `;
        await client.query(sql);
        console.log('✅ Columnas de visita agregadas exitosamente.');
    } catch (err) {
        console.error('❌ Error en migración:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
