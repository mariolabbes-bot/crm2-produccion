const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('--- DIAGNOSTICO DB ---');
console.log('CWD:', process.cwd());
console.log('URL defined:', !!process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false // Forzar sin SSL para ver si el error cambia
});

async function test() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Conexión exitosa (sin SSL):', res.rows[0]);
    } catch (err) {
        console.log('❌ Error sin SSL:', err.message);
        if (err.message.includes('SSL')) {
            console.log('Reintentando con SSL...');
            const poolSSL = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            try {
                const res2 = await poolSSL.query('SELECT NOW()');
                console.log('✅ Conexión exitosa (con SSL):', res2.rows[0]);
            } catch (err2) {
                console.log('❌ Error con SSL:', err2.message);
            }
        }
    } finally {
        process.exit(0);
    }
}

test();
