
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugComparativo() {
    try {
        console.log('--- DEBUG COMPARATIVO FILTERING (JAN 2026) ---');

        // Mock Parameters: LOGIN AS OMAR
        const omarNameQuery = "Omar";
        const info = await pool.query("SELECT rut, nombre_vendedor, alias FROM usuario WHERE nombre_vendedor ILIKE $1 LIMIT 1", [`%${omarNameQuery}%`]);

        if (info.rows.length === 0) throw new Error('Omar not found in DB');

        const omarRut = info.rows[0].rut;
        const omarName = info.rows[0].nombre_vendedor;
        const omarAlias = info.rows[0].alias;

        console.log(`Testing for User: ${omarName} (RUT: ${omarRut}, Alias: ${omarAlias})`);

        const filterVendedorId = omarRut;
        const fecha_desde = '2026-01-01'; // JAN 2026
        const fecha_hasta = '2026-01-31';
        const dateFormat = 'YYYY-MM';

        // --- FILTER LOGIC (Simulating abonos.js) ---
        const abonosTable = 'abono';
        const abonoFechaCol = 'fecha';
        const abonoMontoCol = 'monto'; // Priority fixed

        let whereClauseAbonos = 'WHERE 1=1';
        let abonosParams = [];
        let abonosParamCounter = 1;

        // Logic Step 1: Detect User
        if (filterVendedorId) {
            // Logic Step 2: Resolve ID -> Name
            console.log(`[LOGIC] Resolving ID ${filterVendedorId} to Name...`);
            const userRes = await pool.query('SELECT nombre_vendedor, alias FROM usuario WHERE rut = $1', [filterVendedorId]);

            if (userRes.rows.length > 0) {
                const uName = userRes.rows[0].nombre_vendedor;
                const uAlias = userRes.rows[0].alias;
                console.log(`[LOGIC] Resolved: ${uName} / ${uAlias}`);

                whereClauseAbonos += ` AND (UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($${abonosParamCounter}))`;
                abonosParams.push(uName);
                abonosParamCounter++;

                if (uAlias) {
                    whereClauseAbonos += ` OR UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($${abonosParamCounter}))`;
                    abonosParams.push(uAlias);
                    abonosParamCounter++;
                }
                whereClauseAbonos += `)`;
            } else {
                console.log(`[LOGIC] User NOT found by RUT.`);
                whereClauseAbonos += ` AND 1=0`;
            }
        }

        if (fecha_desde) {
            whereClauseAbonos += ` AND ${abonoFechaCol} >= $${abonosParamCounter}`;
            abonosParams.push(fecha_desde);
            abonosParamCounter++;
        }
        if (fecha_hasta) {
            whereClauseAbonos += ` AND ${abonoFechaCol} <= $${abonosParamCounter}`;
            abonosParams.push(fecha_hasta);
            abonosParamCounter++;
        }

        const query = `
            SELECT 
                TO_CHAR(${abonoFechaCol}, '${dateFormat}') as periodo,
                vendedor_cliente as vendedor_key,
                SUM(${abonoMontoCol}) as total_abonos
            FROM ${abonosTable}
            ${whereClauseAbonos}
            GROUP BY TO_CHAR(${abonoFechaCol}, '${dateFormat}'), vendedor_cliente
        `;

        console.log('SQL:', query);
        console.log('Params:', abonosParams);

        const res = await pool.query(query, abonosParams);
        console.log(`Rows Found for ${omarName} in Jan 2026:`, res.rows.length);
        if (res.rows.length > 0) {
            console.log('Sample:', res.rows[0]);
        } else {
            console.log('!!! ZERO ROWS FOUND FOR 2026 !!!');
            // Diagnosis: Check if raw data exists for Omar in 2026 without filter logic
            const checkRaw = await pool.query(`SELECT COUNT(*) as cnt FROM abono WHERE fecha >= '2026-01-01' AND vendedor_cliente ILIKE '%Omar%'`);
            console.log(`Raw Check (ILIKE %Omar%, Jan 2026): ${checkRaw.rows[0].cnt}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugComparativo();
