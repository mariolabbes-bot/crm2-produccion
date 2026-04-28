require('dotenv').config({ path: `${__dirname}/../.env` });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function reassignClients() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando reasignación masiva de vendedor_id en tabla Clientes...');
        await client.query('BEGIN');

        // 1. Obtener todos los usuarios vendedores y managers
        const usersRes = await client.query(`
            SELECT id, rut, nombre_vendedor, alias, rol_usuario
            FROM usuario
            WHERE LOWER(rol_usuario) IN ('vendedor', 'manager') AND nombre_vendedor IS NOT NULL
        `);

        let totalUpdated = 0;

        for (const user of usersRes.rows) {
            console.log(`Procesando Vendedor: ${user.nombre_vendedor} (RUT: ${user.rut}, Alias: ${user.alias})`);

            // 2. Para cada usuario, buscar todos los identificadores (ruts de cliente) en la tabla 'venta' 
            //    cuyo vendedor_cliente (o alias) coincidan con el usuario actual.
            
            const updateRes = await client.query(`
                WITH clientes_a_actualizar AS (
                    SELECT DISTINCT identificador
                    FROM venta
                    WHERE UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($1))
                       OR (UPPER(TRIM(vendedor_documento)) = UPPER(TRIM($2)) AND $2 IS NOT NULL AND $2 != '')
                )
                UPDATE cliente c
                SET vendedor_id = $3
                FROM clientes_a_actualizar ca
                WHERE REGEXP_REPLACE(c.rut, '[^a-zA-Z0-9]', '', 'g') = REGEXP_REPLACE(ca.identificador, '[^a-zA-Z0-9]', '', 'g')
                  AND (c.vendedor_id::text IS NULL OR c.vendedor_id::text != $3)
                RETURNING c.rut
            `, [user.nombre_vendedor, user.alias, user.rut]);

            console.log(`   ✅ Clientes reasignados a este vendedor: ${updateRes.rowCount}`);
            totalUpdated += updateRes.rowCount;
        }

        console.log(`\n🎉 Proceso completado. Total de clientes corregidos y reasignados: ${totalUpdated}`);
        await client.query('COMMIT');
    } catch (error) {
        console.error('❌ Error durante la reasignación:', error);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        await pool.end();
    }
}

reassignClients();
