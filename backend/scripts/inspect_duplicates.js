require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDuplicates() {
    try {
        console.log('--- DETALLE DUPLICADOS VENDEDORES ---');
        const result = await pool.query(`
      SELECT rut, nombre_vendedor, rol_usuario
      FROM usuario
      WHERE nombre_vendedor IN (
        SELECT nombre_vendedor 
        FROM usuario 
        WHERE LOWER(rol_usuario) = 'vendedor'
        GROUP BY 1 
        HAVING COUNT(*) > 1
      )
      ORDER BY nombre_vendedor, rut
    `);

        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDuplicates();
