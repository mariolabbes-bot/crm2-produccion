require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testRanking() {
    const client = await pool.connect();
    try {
        console.log('--- TESTING RANKING VENDEDORES QUERY ---');

        // Emulate Logic from kpis.js
        const salesTable = 'venta'; // Asumido
        const abonosTable = 'abono';
        const dateCol = 'fecha_emision'; // Asumido
        const amountCol = 'valor_total';
        const abonoFechaCol = 'fecha'; // Corrected from fecha_abono
        const abonoMontoCol = 'monto_neto';

        // Current Month (2026-01)
        const currentMonthStr = '2026-01';
        const prevYearMonthStr = '2025-01';

        // Prev Quarter (Oct, Nov, Dec 2025)
        const prevQuarterMonths = ['2025-10', '2025-11', '2025-12'];

        console.log('Periods:', { currentMonthStr, prevYearMonthStr, prevQuarterMonths });

        const query = `
          WITH sales_stats AS (
            SELECT 
                UPPER(TRIM(vendedor_cliente)) as vendor_key,
                SUM(CASE WHEN TO_CHAR(${dateCol}, 'YYYY-MM') = '${currentMonthStr}' THEN ${amountCol} ELSE 0 END) as ventas_mes_actual,
                SUM(CASE WHEN TO_CHAR(${dateCol}, 'YYYY-MM') = '${prevYearMonthStr}' THEN ${amountCol} ELSE 0 END) as ventas_anio_anterior,
                SUM(CASE WHEN TO_CHAR(${dateCol}, 'YYYY-MM') IN ('${prevQuarterMonths.join("','")}') THEN ${amountCol} ELSE 0 END) as ventas_trimestre_ant
            FROM ${salesTable}
            GROUP BY UPPER(TRIM(vendedor_cliente))
          ),
          abono_stats AS (
            SELECT 
                UPPER(TRIM(vendedor_cliente)) as vendor_key,
                SUM(CASE WHEN TO_CHAR(${abonoFechaCol}, 'YYYY-MM') = '${currentMonthStr}' THEN ${abonoMontoCol} ELSE 0 END) as abonos_mes_actual
            FROM ${abonosTable}
            GROUP BY UPPER(TRIM(vendedor_cliente))
          )
          SELECT 
            u.nombre_vendedor,
            COALESCE(s.ventas_mes_actual, 0) as ventas_mes_actual,
            COALESCE(a.abonos_mes_actual, 0) as abonos_mes_actual,
            COALESCE(s.ventas_trimestre_ant, 0) / 3 as prom_ventas_trimestre_ant,
            COALESCE(s.ventas_anio_anterior, 0) as ventas_anio_anterior
          FROM usuario u
          LEFT JOIN sales_stats s ON UPPER(TRIM(u.nombre_vendedor)) = s.vendor_key
          LEFT JOIN abono_stats a ON UPPER(TRIM(u.nombre_vendedor)) = a.vendor_key
          WHERE u.rol_usuario IN ('vendedor', 'manager', 'VENDEDOR', 'MANAGER')
          ORDER BY ventas_mes_actual DESC NULLS LAST
          LIMIT 5
        `;

        const res = await client.query(query);
        console.table(res.rows.map(r => ({
            ...r,
            ventas_mes: parseInt(r.ventas_mes_actual).toLocaleString(),
            abonos_mes: parseInt(r.abonos_mes_actual).toLocaleString(),
            prom_trim: parseInt(r.prom_ventas_trimestre_ant).toLocaleString(),
            ventas_anio_ant: parseInt(r.ventas_anio_anterior).toLocaleString()
        })));

    } catch (err) {
        console.error('❌ Query Failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testRanking();
