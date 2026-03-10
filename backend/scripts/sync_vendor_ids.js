require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/db');

async function syncVendorIds() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando sincronización de vendedor_id en tabla cliente...');

        // 1. Obtener todos los usuarios vendedores con sus IDs y nombres (o alias)
        const usersRes = await client.query('SELECT id, rut, nombre_vendedor, nombre_completo, alias FROM usuario');
        const users = usersRes.rows;
        console.log(`✅ ${users.length} usuarios cargados para mapeo.`);

        let totalUpdated = 0;

        for (const u of users) {
            // Intentamos mapear por nombre_vendedor exacto
            if (u.nombre_vendedor) {
                const res = await client.query(
                    'UPDATE cliente SET vendedor_id = $1 WHERE nombre_vendedor = $2 AND (vendedor_id IS NULL OR vendedor_id != $1)',
                    [u.id, u.nombre_vendedor]
                );
                if (res.rowCount > 0) {
                    console.log(`   🔸 [Nombre] ${u.nombre_vendedor} -> ID ${u.id} (${res.rowCount} clientes)`);
                    totalUpdated += res.rowCount;
                }
            }

            // Intentamos mapear por nombre_completo exacto (si es diferente al nombre_vendedor)
            if (u.nombre_completo && u.nombre_completo !== u.nombre_vendedor) {
                const res2 = await client.query(
                    'UPDATE cliente SET vendedor_id = $1 WHERE nombre_vendedor = $2 AND (vendedor_id IS NULL OR vendedor_id != $1)',
                    [u.id, u.nombre_completo]
                );
                if (res2.rowCount > 0) {
                    console.log(`   🔸 [Completo] ${u.nombre_completo} -> ID ${u.id} (${res2.rowCount} clientes)`);
                    totalUpdated += res2.rowCount;
                }
            }
        }

        console.log(`\n✨ Finalizado. Total de clientes actualizados: ${totalUpdated}`);

        // Verificación final: ¿cuántos quedaron sin vendedor_id?
        const orphans = await client.query('SELECT COUNT(*) FROM cliente WHERE vendedor_id IS NULL');
        console.log(`⚠️ Clientes sin vendedor_id: ${orphans.rows[0].count}`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

syncVendorIds();
