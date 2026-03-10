const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function testVendedores() {
    try {
        console.log('Testing active vendors query...');
        const query = `
          SELECT DISTINCT ON (u.rut)
            u.id,
            u.rut,
            u.nombre_vendedor as nombre,
            u.correo,
            u.rol_usuario as rol,
            u.alias
          FROM usuario u
          WHERE (LOWER(u.rol_usuario) = 'vendedor' OR LOWER(u.rol_usuario) = 'manager')
          AND (
            EXISTS (SELECT 1 FROM venta v WHERE UPPER(TRIM(v.vendedor_cliente)) = UPPER(TRIM(u.nombre_vendedor)) LIMIT 1)
            OR EXISTS (SELECT 1 FROM venta v WHERE UPPER(TRIM(v.vendedor_documento)) = UPPER(TRIM(u.alias)) LIMIT 1)
          )
          AND u.nombre_vendedor IS NOT NULL
          AND (u.alias IS NULL OR u.alias NOT ILIKE '%_OLD')
          AND u.rut NOT ILIKE 'stub-%'
          ORDER BY u.rut, LOWER(TRIM(u.nombre_vendedor)) ASC
        `;
        const result = await pool.query(query);
        console.log('Success! Count:', result.rows.length);
        console.log('Sample vendors:', result.rows.slice(0, 5).map(v => ({ rut: v.rut, nombre: v.nombre })));
    } catch (err) {
        console.error('SQL ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

testVendedores();
