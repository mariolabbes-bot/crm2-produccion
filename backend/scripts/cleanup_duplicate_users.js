require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function cleanupDuplicates() {
    try {
        console.log('--- LIMPIEZA DE USUARIOS DUPLICADOS ---');

        // Contar antes
        const resBefore = await pool.query("SELECT COUNT(*) FROM usuario WHERE LOWER(rol_usuario) = 'vendedor'");
        console.log(`Vendedores antes: ${resBefore.rows[0].count}`);

        // Ejecutar borrado seguro (conservar el STUB más reciente o cualquiera)
        // Borramos aquellos donde existe otro registro con el mismo nombre y un ctid mayor (es decir, conservamos el último insertado)
        const deleteQuery = `
      DELETE FROM usuario a USING usuario b
      WHERE a.ctid < b.ctid
      AND a.nombre_vendedor = b.nombre_vendedor
      AND LOWER(a.rol_usuario) = 'vendedor'
      AND LOWER(b.rol_usuario) = 'vendedor'
      RETURNING a.nombre_vendedor;
    `;

        const resDelete = await pool.query(deleteQuery);
        console.log(`✅ Eliminados ${resDelete.rowCount} registros duplicados.`);

        // Contar después
        const resAfter = await pool.query("SELECT COUNT(*) FROM usuario WHERE LOWER(rol_usuario) = 'vendedor'");
        console.log(`Vendedores después: ${resAfter.rows[0].count}`);

    } catch (err) {
        if (err.code === '23503') { // Foreign key violation
            console.error('❌ No se pueden borrar usuarios porque tienen ventas asociadas (FK Constraint).');
            console.error('   Se requiere una migración de ID de vendedores en la tabla ventas antes de borrar.');
        } else {
            console.error('❌ Error:', err);
        }
    } finally {
        await pool.end();
    }
}

cleanupDuplicates();
