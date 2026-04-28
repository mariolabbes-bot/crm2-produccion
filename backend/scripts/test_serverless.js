const { neon } = require('@neondatabase/serverless');
require('dotenv').config({path: './.env'});

async function testNeonServerless() {
    console.log('Probando conexión a Neon vía @neondatabase/serverless (Puerto 443 / WebSockets)...');
    
    // El driver serverless usa HTTPS/WebSockets por defecto en puerto 443 si no se especifica otro
    const sql = neon(process.env.DATABASE_URL);

    try {
        const result = await sql`SELECT NOW()`;
        console.log('✅ ¡Éxito! Conexión establecida vía serverless driver.');
        console.log('Hora del servidor:', result[0].now);
    } catch (err) {
        console.error('❌ Error de conexión serverless:', err.message);
    }
}

testNeonServerless();
