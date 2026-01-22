
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixVendorNames() {
    const mappingFile = path.resolve(__dirname, '../outputs/mapeo_vendedores.csv');
    const mappings = [];

    console.log('--- NORMALIZACION DE NOMBRES DE VENDEDORES ---');
    console.log(`Leyendo archivo de mapeo: ${mappingFile}`);

    // 1. Leer CSV de mapeo
    await new Promise((resolve, reject) => {
        fs.createReadStream(mappingFile)
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => {
                const source = row.NOMBRE_USUARIO_LOGIN ? row.NOMBRE_USUARIO_LOGIN.trim() : null;
                const target = row.ASIGNAR_NOMBRE_VENTAS_EXACTO ? row.ASIGNAR_NOMBRE_VENTAS_EXACTO.trim() : null;

                // Solo si tenemos ambos y son diferentes
                if (source && target && source !== target) {
                    mappings.push({ source, target });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Se encontraron ${mappings.length} reglas de normalización.`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const { source, target } of mappings) {
            console.log(`Normalizando: '${source}' -> '${target}'`);

            // Actualizar Ventas
            const resVenta = await client.query(
                'UPDATE venta SET vendedor_cliente = $1 WHERE vendedor_cliente = $2',
                [target, source]
            );
            if (resVenta.rowCount > 0) console.log(`  - Ventas actualizadas: ${resVenta.rowCount}`);

            // Actualizar Abonos
            const resAbono = await client.query(
                'UPDATE abono SET vendedor_cliente = $1 WHERE vendedor_cliente = $2',
                [target, source]
            );
            if (resAbono.rowCount > 0) console.log(`  - Abonos actualizados: ${resAbono.rowCount}`);

            // Actualizar Usuario (nombre_vendedor) para logins futuros
            // NOTA: No actualizamos el nombre de usuario/login, solo el campo que liga a las ventas
            const resUsuario = await client.query(
                'UPDATE usuario SET nombre_vendedor = $1 WHERE nombre_vendedor = $2',
                [target, source]
            );
            if (resUsuario.rowCount > 0) console.log(`  - Usuarios actualizados: ${resUsuario.rowCount}`);
        }

        await client.query('COMMIT');
        console.log('--- PROCESO COMPLETADO EXITOSAMENTE ---');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('ERROR: Transacción abortada.', e);
    } finally {
        client.release();
        pool.end();
    }
}

fixVendorNames();
