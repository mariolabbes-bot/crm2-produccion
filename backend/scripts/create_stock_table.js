const pool = require('../src/db');

async function createStockTable() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Creando tabla stock...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS stock (
                id SERIAL PRIMARY KEY,
                sku VARCHAR(150) NOT NULL,
                sucursal VARCHAR(150) NOT NULL,
                cantidad DECIMAL(12, 2) DEFAULT 0,
                ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(sku, sucursal)
            );
        `);

        console.log('Creando índices para acelerar búsquedas...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_sku ON stock(sku);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_sucursal ON stock(sucursal);`);

        await client.query('COMMIT');
        console.log('✅ Tabla stock creada exitosamente.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error creando tabla stock:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

createStockTable();
