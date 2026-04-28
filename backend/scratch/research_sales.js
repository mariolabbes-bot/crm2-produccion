
const pool = require('../src/db');

async function research() {
  try {
    const lastMonthRes = await pool.query("SELECT TO_CHAR(MAX(fecha_emision), 'YYYY-MM') as last_month FROM venta");
    const lastMonth = lastMonthRes.rows[0].last_month;
    console.log(`Researching for month: ${lastMonth}`);

    console.log('\n--- VENDORS IN DATABASE ---');
    const vendors = await pool.query("SELECT rut, nombre_vendedor, alias FROM usuario WHERE LOWER(rol_usuario) IN ('vendedor', 'manager') AND nombre_vendedor IS NOT NULL ORDER BY nombre_vendedor");
    console.table(vendors.rows);

    console.log('\n--- TOTALS BY vendedor_cliente (from venta table) ---');
    const groupingVendedorCliente = await pool.query(`
      SELECT vendedor_cliente, SUM(valor_total) as total
      FROM venta
      WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $1
      GROUP BY vendedor_cliente
      ORDER BY total DESC
    `, [lastMonth]);
    console.table(groupingVendedorCliente.rows);

    console.log('\n--- TOTALS BY NEW ranking-vendedores LOGIC (using vendedor_cliente) ---');
    const newRankingLogic = await pool.query(`
        WITH sales_stats AS (
          SELECT 
            vendedor_cliente,
            SUM(CASE WHEN TO_CHAR(fecha_emision, 'YYYY-MM') = $1 THEN valor_total ELSE 0 END) as ventas_mes_actual
          FROM venta
          WHERE vendedor_cliente IS NOT NULL
          GROUP BY vendedor_cliente
        ),
        abono_stats AS (
          SELECT 
            vendedor_cliente,
            SUM(CASE WHEN TO_CHAR(fecha, 'YYYY-MM') = $1 THEN COALESCE(monto_neto, monto / 1.19) ELSE 0 END) as abonos_mes_actual
          FROM abono
          WHERE vendedor_cliente IS NOT NULL
          GROUP BY vendedor_cliente
        ),
        combined_stats AS (
          SELECT 
            COALESCE(s.vendedor_cliente, a.vendedor_cliente) as vendedor_nombre,
            COALESCE(s.ventas_mes_actual, 0) as ventas_mes_actual,
            COALESCE(a.abonos_mes_actual, 0) as abonos_mes_actual
          FROM sales_stats s
          FULL OUTER JOIN abono_stats a ON s.vendedor_cliente = a.vendedor_cliente
        )
        SELECT 
          u.rut,
          cs.vendedor_nombre as nombre_vendedor,
          cs.ventas_mes_actual,
          cs.abonos_mes_actual
        FROM combined_stats cs
        LEFT JOIN usuario u ON (
          UPPER(TRIM(cs.vendedor_nombre)) = UPPER(TRIM(u.nombre_vendedor))
          OR UPPER(TRIM(cs.vendedor_nombre)) = UPPER(TRIM(u.alias))
        )
        WHERE (u.rut IS NULL OR (
          LOWER(u.rol_usuario) IN ('vendedor', 'manager')
          AND (u.alias IS NULL OR (u.alias NOT ILIKE '%_old' AND TRIM(u.alias) != ''))
          AND u.rut NOT ILIKE 'stub-%'
        ))
        AND cs.ventas_mes_actual > 0
        ORDER BY cs.ventas_mes_actual DESC
    `, [lastMonth]);
    console.table(newRankingLogic.rows);

    console.log('\n--- UNMAPPED VENDORS IN venta TABLE (vendedor_cliente NOT IN usuario.nombre_vendedor/alias) ---');
    const unmapped = await pool.query(`
      SELECT DISTINCT vendedor_cliente
      FROM venta
      WHERE vendedor_cliente NOT IN (SELECT nombre_vendedor FROM usuario)
        AND vendedor_cliente NOT IN (SELECT alias FROM usuario WHERE alias IS NOT NULL)
        AND vendedor_cliente IS NOT NULL
    `);
    console.table(unmapped.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

research();
