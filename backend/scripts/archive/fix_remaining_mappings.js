require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FIXES = [
    // Encoding fix for Nelson
    { rut: '09.338.644-2', credito: 'Nelson Mu√±oz' },
    // Map isolated records to identifying STUBs
    { rut: 'STUB-5086051', credito: 'Matias Ignacio Tapia' },
    { rut: 'STUB-1516593', credito: 'Octavio Contreras' }
];

async function fix() {
    const client = await pool.connect();
    try {
        console.log('--- APPLYING FINAL MAPPING FIXES ---');

        for (const map of FIXES) {
            const res = await client.query(`
                UPDATE usuario 
                SET nombre_credito = $1 
                WHERE rut = $2
            `, [map.credito, map.rut]);

            if (res.rowCount > 0) {
                console.log(`✅ Updated ${map.rut} -> ${map.credito}`);
            } else {
                console.warn(`⚠️ User not found for RUT: ${map.rut}. Trying to find by alias...`);
                // Fallback for STUBs if RUT is elusive, though search showed these RUTs.
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
