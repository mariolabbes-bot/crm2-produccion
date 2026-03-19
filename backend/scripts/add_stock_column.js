const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });

async function addStockColumn() {
    try {
        console.log('Adding stock_por_sucursal column to producto table...');
        await pool.query("ALTER TABLE producto ADD COLUMN IF NOT EXISTS stock_por_sucursal JSONB DEFAULT '{}'::jsonb;");
        console.log('Column added successfully.');
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        pool.end();
    }
}

addStockColumn();
