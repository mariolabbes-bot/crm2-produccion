const { Pool } = require('pg');
require('dotenv').config({path: './.env'});

// Intento forzar puerto 443
const connectionString = process.env.DATABASE_URL.replace('.tech/', '.tech:443/');

async function testConnection() {
    console.log('Probando conexión a Neon vía puerto 443...');
    console.log('URL de prueba:', connectionString.split('@')[1]);
    
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ ¡Éxito! Conexión establecida vía puerto 443.');
        console.log('Hora del servidor:', res.rows[0].now);
    } catch (err) {
        console.error('❌ Error de conexión:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
