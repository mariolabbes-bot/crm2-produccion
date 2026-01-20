require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MAPPING = [
    { rut: '11.599.857-9', credito: 'Alex Mondaca' },
    { rut: '09.262.987-2', credito: 'Eduardo Ponce' },
    { rut: '13.830.417-5', credito: 'Eduardo Rojas Rojas' },
    { rut: '12.569.531-0', credito: 'Emilio Santos' },
    { rut: '7.775.897-6', credito: 'JOAQUIN MANRIQUEZ' },
    { rut: '05.715.101-3', credito: 'Jorge Gutierrez' },
    { rut: '11.823.790-0', credito: 'Luis Esquivel' },
    { rut: '13.018.313-1', credito: 'Maiko Flores' },
    { rut: '16.412.525-4', credito: 'Marcelo Troncoso' },
    { rut: '13.087.134-8', credito: 'Marisol Sanchez' },
    { rut: '14.138.537-2', credito: 'Matias Felipe Tapia' },
    { rut: '12.570.853-6', credito: 'Milton Marin' },
    { rut: '16.082.310-0', credito: 'Nataly Carrasco' },
    { rut: '09.338.644-2', credito: 'Nelson Muñoz' }, // Assuming standard encoding
    { rut: '10.913.019-2', credito: 'Omar Maldonado' },
    { rut: '07.107.100-6', credito: 'Roberto Oyarzun' },
    { rut: '12.051.321-4', credito: 'Victoria Hurtado' }
];

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- MIGRATION: ADDING nombre_credito TO USUARIO ---');

        // 1. Add Column if not exists
        console.log('Checking column...');
        await client.query(`
            ALTER TABLE usuario 
            ADD COLUMN IF NOT EXISTS nombre_credito VARCHAR(100);
        `);
        // Add index for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_usuario_nombre_credito ON usuario(nombre_credito);
        `);
        console.log('✅ Column `nombre_credito` ensured.');

        // 2. Populate Data
        console.log('Populating data...');
        for (const map of MAPPING) {
            const res = await client.query(`
                UPDATE usuario 
                SET nombre_credito = $1 
                WHERE rut = $2
            `, [map.credito, map.rut]);

            if (res.rowCount > 0) {
                console.log(`Updated ${map.rut} -> ${map.credito}`);
            } else {
                console.warn(`⚠️ User not found for RUT: ${map.rut}`);
            }
        }

        console.log('✅ Migration complete.');

    } catch (err) {
        console.error('FATAL ERROR:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
