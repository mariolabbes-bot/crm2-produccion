
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function createVisitsTable() {
    try {
        console.log('--- CREATING VISITAS_REGISTRO TABLE ---');

        const query = `
            CREATE TABLE IF NOT EXISTS visitas_registro (
                id SERIAL PRIMARY KEY,
                vendedor_id INTEGER REFERENCES usuario(id),
                cliente_rut VARCHAR REFERENCES cliente(rut),
                fecha DATE DEFAULT CURRENT_DATE,
                hora_inicio TIME,
                hora_fin TIME,
                latitud_inicio NUMERIC,
                longitud_inicio NUMERIC,
                latitud_fin NUMERIC,
                longitud_fin NUMERIC,
                estado VARCHAR(50) DEFAULT 'en_progreso', -- 'en_progreso', 'completada', 'cancelada'
                resultado VARCHAR(50), -- 'venta', 'no_venta', 'cobranza', 'otro'
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_visitas_vendedor_fecha ON visitas_registro(vendedor_id, fecha);
            CREATE INDEX IF NOT EXISTS idx_visitas_cliente ON visitas_registro(cliente_rut);
        `;

        await pool.query(query);
        console.log('✅ Table visitas_registro created/verified successfully.');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await pool.end();
    }
}

createVisitsTable();
