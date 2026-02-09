require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyFix() {
    const client = await pool.connect();
    try {
        console.log('--- VERIFYING FIX: ABONOS QUERY ---');

        // Emulate the logic in getAbonosPorVendedor

        // 1. Detect columns
        const { rows: scols } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'venta'`);
        const sColSet = new Set(scols.map(c => c.column_name));
        let ventasMatchCondition = 's.vendedor_id = u.id';
        if (sColSet.has('vendedor_cliente')) {
            ventasMatchCondition = 'UPPER(TRIM(s.vendedor_cliente)) = UPPER(TRIM(u.nombre_vendedor))';
        }
        console.log('Ventas Condition:', ventasMatchCondition);

        const { rows: acols } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'abono'`);
        const aColSet = new Set(acols.map(c => c.column_name));
        let abonoJoinCondition = 'FALSE';
        if (aColSet.has('vendedor_cliente')) {
            abonoJoinCondition = 'UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente))';
        }
        console.log('Abono Condition:', abonoJoinCondition);

        // 2. Run Query
        const query = `
          SELECT 
            u.rut as vendedor_id,
            u.nombre_vendedor as vendedor_nombre,
            COUNT(a.id) as cantidad_abonos,
            COALESCE(SUM(a.monto), 0) as total_abonos,
            
            -- Subquery Ventas
            ( SELECT COUNT(*) FROM venta s WHERE ${ventasMatchCondition} ) as cantidad_ventas,
            ( SELECT COALESCE(SUM(valor_total), 0) FROM venta s WHERE ${ventasMatchCondition} ) as total_ventas

          FROM usuario u
          LEFT JOIN abono a ON ${abonoJoinCondition}
          WHERE u.rol_usuario IN ('vendedor', 'manager', 'VENDEDOR', 'MANAGER')
          GROUP BY u.rut, u.nombre_vendedor
          ORDER BY total_abonos DESC NULLS LAST
          LIMIT 5
        `;

        const res = await client.query(query);
        console.log('\nResults:');
        console.table(res.rows);

    } catch (err) {
        console.error('❌ Query Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyFix();
