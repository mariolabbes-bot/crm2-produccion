require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function createTable() {
    const client = await pool.connect();
    try {
        console.log('Creating app_notifications table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS app_notifications (
                id SERIAL PRIMARY KEY,
                user_role VARCHAR(50) DEFAULT 'admin',
                type VARCHAR(20) DEFAULT 'info', -- info, success, warning, error
                title VARCHAR(255) NOT NULL,
                message TEXT,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Table app_notifications created successfully.');

        // Add index on user_role and read status for faster querying
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notif_role_read ON app_notifications(user_role, read);`);
        console.log('✅ Indexes created.');

    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

createTable();
