require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { runDriveImportCycle } = require('../src/services/importAutomation');
const pool = require('../src/db');

const { Client } = require('pg');

async function warmUpDB() {
    console.log('🔥 Despertando base de datos remota (Neon)...');
    try {
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 30000,
            query_timeout: 30000
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        console.log('✅ Base de datos despertada exitosamente.');
    } catch (e) {
        console.warn(`⚠️ Primer intento fallido al despertar Neon: ${e.message}. Reintentando en 5s...`);
        await new Promise(r => setTimeout(r, 5000));
        const client2 = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 30000,
            query_timeout: 30000
        });
        await client2.connect();
        await client2.query('SELECT 1');
        await client2.end();
        console.log('✅ Base de datos conectada en el segundo intento.');
    }
}

async function forceRun() {
    console.log('🚀 Forzando ejecución del Importador Automático (Google Drive)...');
    try {
        await warmUpDB();
        await runDriveImportCycle();
        console.log('✅ Ciclo finalizado.');
    } catch (error) {
        console.error('❌ Error forzando ciclo:', error);
    } finally {
        console.log('👋 Cerrando proceso en 5 segundos...');
        setTimeout(() => {
            pool.end().catch(() => { });
            process.exit(0);
        }, 5000);
    }
}

forceRun();
