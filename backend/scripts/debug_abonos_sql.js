require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runDiagnosis() {
    try {
        console.log('--- DIAGNOSTICO DE ABONOS (SQL REPLICA) ---');

        // 1. Verificar conteo crudo
        const count = await pool.query('SELECT COUNT(*) FROM abono');
        console.log('Total filas en tabla abono:', count.rows[0].count);

        // 2. Verificar monto_neto nulls
        const nulls = await pool.query('SELECT COUNT(*) FROM abono WHERE monto_neto IS NULL');
        console.log('Filas con monto_neto NULL:', nulls.rows[0].count);

        // 3. Replicar Query de Abonos del Endpoint Comparativo
        // NOTA: Usamos el mismo SQL que vimos en abonos.js
        const ABONOS_TABLE = 'abono';
        const abonoFechaCol = 'fecha';
        const abonoMontoCol = 'monto';
        // Simulamos la expresion COALESCE
        const abonoMontoExpr = `COALESCE(monto_neto, ${abonoMontoCol} / 1.19)`;
        const dateFormat = 'YYYY-MM';

        const abonosQuery = `
            SELECT 
                TO_CHAR(a.${abonoFechaCol}, '${dateFormat}') as periodo,
                u.nombre_vendedor as vendedor,
                u.rut as vendedor_rut,
                SUM(${abonoMontoExpr}) as total_abonos,
                COUNT(*) as cantidad_abonos
            FROM ${ABONOS_TABLE} a
            LEFT JOIN usuario u ON (UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente)) OR UPPER(TRIM(u.alias)) = UPPER(TRIM(a.vendedor_cliente)))
            WHERE a.fecha >= '2026-01-01'
            GROUP BY 1, 2, 3
            ORDER BY total_abonos DESC
        `;

        console.log('\n--- Ejecutando Query de Comparativo (2026) ---');
        const res = await pool.query(abonosQuery);
        console.log('Filas devueltas:', res.rowCount);

        if (res.rowCount > 0) {
            console.log('Top 5 resultados:');
            console.table(res.rows.slice(0, 5));
        } else {
            console.log('⚠️ LA CONSULTA DEVOLVIÓ 0 RESULTADOS.');

            // Diagnostico de JOIN
            console.log('\n--- Diagnóstico de Join ---');
            const joinCheck = await pool.query(`
                SELECT 
                    a.vendedor_cliente, 
                    u.nombre_vendedor, 
                    u.alias,
                    COUNT(*)
                FROM abono a
                LEFT JOIN usuario u ON (UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente)) OR UPPER(TRIM(u.alias)) = UPPER(TRIM(a.vendedor_cliente)))
                WHERE a.fecha >= '2026-01-01'
                GROUP BY 1, 2, 3
                LIMIT 5
            `);
            console.table(joinCheck.rows);
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

runDiagnosis();
