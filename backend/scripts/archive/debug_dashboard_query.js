
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugDashboard() {
    try {
        console.log('--- DEBUG DASHBOARD COMPARATIVO ---');

        // Simular params (todos los vendedores, año actual)
        const dateFormat = 'YYYY-MM';
        const dateValues = ['2023-01-01', '2026-12-31']; // Rango amplio

        // 1. Consulta Abonos (Group by vendedor_cliente)
        // Usamos la logica exacta detectada: vendedor_cliente
        console.log('Querying Abonos...');
        const abonosQuery = `
            SELECT 
                TO_CHAR(fecha, '${dateFormat}') as periodo,
                vendedor_cliente as vendedor_key,
                SUM(monto) as total_abonos,
                COUNT(*) as cantidad_abonos
            FROM abono
            WHERE fecha >= $1 AND fecha <= $2
            GROUP BY TO_CHAR(fecha, '${dateFormat}'), vendedor_cliente
            ORDER BY total_abonos DESC
            LIMIT 5
        `;
        const abonosRes = await pool.query(abonosQuery, dateValues);
        console.log('Top 5 Abonos Result:', abonosRes.rows);

        // 2. Consulta Ventas
        console.log('Querying Ventas...');
        const ventasQuery = `
            SELECT 
                TO_CHAR(fecha_emision, '${dateFormat}') as periodo,
                vendedor_cliente as vendedor_key,
                SUM(valor_total) as total_ventas,
                COUNT(*) as cantidad_ventas
            FROM venta
            WHERE fecha_emision >= $1 AND fecha_emision <= $2
            GROUP BY TO_CHAR(fecha_emision, '${dateFormat}'), vendedor_cliente
            ORDER BY total_ventas DESC
            LIMIT 5
        `;
        const ventasRes = await pool.query(ventasQuery, dateValues);
        console.log('Top 5 Ventas Result:', ventasRes.rows);



        console.log('\n--- DIAGNOSTICO USUARIOS vs ABONOS ---');
        const users = await pool.query('SELECT rut, nombre_vendedor, alias, rol_usuario FROM usuario');
        console.log(`Found ${users.rows.length} users.`);

        // Check Omar
        const omarUser = users.rows.find(u => u.nombre_vendedor && u.nombre_vendedor.includes('Omar'));
        console.log('Omar User:', omarUser);

        // Check Abono Omar
        const omarAbono = await pool.query("SELECT DISTINCT vendedor_cliente FROM abono WHERE vendedor_cliente ILIKE '%Omar%'");
        console.log('Omar Abonos Names:', omarAbono.rows.map(r => r.vendedor_cliente));

        if (omarUser && omarAbono.rows.length > 0) {
            const userVal = omarUser.nombre_vendedor.trim().toUpperCase();
            const abonoVal = omarAbono.rows[0].vendedor_cliente.trim().toUpperCase();
            console.log(`Match? '${userVal}' === '${abonoVal}' =>`, userVal === abonoVal);
        }


        // 3. Verificando coincidencias especificas
        // Tomamos un vendedor de Abonos y vemos si existe en Ventas con la misma key
        if (abonosRes.rows.length > 0) {
            const sampleAbono = abonosRes.rows[0];
            const sampleKey = sampleAbono.vendedor_key;
            console.log(`\nVerificando match para: '${sampleKey}' en periodo '${sampleAbono.periodo}'`);

            const matchVenta = ventasRes.rows.find(v => v.vendedor_key === sampleKey && v.periodo === sampleAbono.periodo);
            if (matchVenta) {
                console.log('MATCH FOUND!', matchVenta);
            } else {
                console.log('NO MATCH FOUND in Top 5 Results. Check exact string equality.');
                // Ver si existe en DB
                const checkVenta = await pool.query(`SELECT vendedor_cliente FROM venta WHERE vendedor_cliente = $1 LIMIT 1`, [sampleKey]);
                console.log(`Existe '${sampleKey}' en tabla venta?`, checkVenta.rows.length > 0 ? 'YES' : 'NO');
            }
        }


        console.log('\n--- SIMULACION EXACTA DASHBOARD QUERY ---');

        const fecha_desde = '2023-01-01';
        const fecha_hasta = '2026-12-31';

        // Assuming detection worked:
        const abonosTable = 'abono';
        const salesTable = 'venta';
        const abonoMontoCol = 'monto';
        const abonoFechaCol = 'fecha';
        const salesAmountCol = 'valor_total';
        const salesDateCol = 'fecha_emision';

        // Exact logic from code:
        const ventasMatchCondition = '(UPPER(TRIM(s.vendedor_cliente)) = UPPER(TRIM(u.nombre_vendedor)) OR UPPER(TRIM(s.vendedor_cliente)) = UPPER(TRIM(u.alias)))';
        const abonoJoinCondition = '(UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente)) OR UPPER(TRIM(u.alias)) = UPPER(TRIM(a.vendedor_cliente)))';
        const joinConditions = `AND a.${abonoFechaCol} >= '${fecha_desde}' AND a.${abonoFechaCol} <= '${fecha_hasta}'`;

        const ventasCantidadSub = `SELECT COUNT(*) FROM ${salesTable} s WHERE ${ventasMatchCondition} AND s.${salesDateCol} >= '${fecha_desde}' AND s.${salesDateCol} <= '${fecha_hasta}'`;
        const ventasTotalSub = `SELECT COALESCE(SUM(${salesAmountCol}), 0) FROM ${salesTable} s WHERE ${ventasMatchCondition} AND s.${salesDateCol} >= '${fecha_desde}' AND s.${salesDateCol} <= '${fecha_hasta}'`;

        const query = `
            SELECT 
                u.rut as vendedor_id,
                u.nombre_vendedor as vendedor_nombre,
                COUNT(a.id) as cantidad_abonos,
                COALESCE(SUM(a.${abonoMontoCol}), 0) as total_abonos,
                COALESCE(AVG(a.${abonoMontoCol}), 0)::numeric(15,2) as promedio_abono,
                ( ${ventasCantidadSub} ) as cantidad_ventas,
                ( ${ventasTotalSub} ) as total_ventas
            FROM usuario u
            LEFT JOIN ${abonosTable} a ON ${abonoJoinCondition} ${joinConditions}
            WHERE u.rol_usuario IN ('vendedor', 'manager', 'VENDEDOR', 'MANAGER')
            GROUP BY u.rut, u.nombre_vendedor, u.alias
            ORDER BY total_abonos DESC NULLS LAST
            LIMIT 10
        `;

        console.log('Running Query...');
        const resQuery = await pool.query(query);
        console.log('Result (Top 10):');
        resQuery.rows.forEach(r => {
            console.log(`User: ${r.vendedor_nombre} | Abonos: $${r.total_abonos} (${r.cantidad_abonos}) | Ventas: $${r.total_ventas}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugDashboard();
