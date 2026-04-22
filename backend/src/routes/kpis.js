const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// TABLAS FIJAS PARA EVITAR ERRORES DE DETECCIÓN DINÁMICA
const SALES_TABLE = 'venta';
const ABONOS_TABLE = 'abono';
const SALES_DATE_COL = 'fecha_emision';
const SALES_AMOUNT_COL = 'valor_total';
const SALES_CLIENT_ID_COL = 'identificador'; // RUT en tabla venta

/**
 * Obtiene el último mes que tiene datos de ventas para mostrar por defecto.
 */
async function getUltimoMesConDatos() {
  try {
    const query = `SELECT TO_CHAR(MAX(${SALES_DATE_COL}), 'YYYY-MM') as last_month FROM ${SALES_TABLE}`;
    const res = await pool.query(query);
    return res.rows[0]?.last_month || new Date().toISOString().slice(0, 7);
  } catch (e) {
    return new Date().toISOString().slice(0, 7);
  }
}

// @route   GET /api/kpis/dashboard-current
// @desc    Get current dashboard KPIs (NUEVO - Corregido)
router.get('/dashboard-current', auth(), async (req, res) => {
  try {
    const user = req.user;
    const isManager = (user.rol || '').toUpperCase() === 'MANAGER';

    // 1. Determinar Mes
    let mesActual;
    if (req.query.mes && /^\d{4}-\d{2}$/.test(req.query.mes)) {
      mesActual = req.query.mes;
    } else {
      mesActual = await getUltimoMesConDatos();
    }

    const [year, month] = mesActual.split('-').map(Number);
    const mesAnioAnterior = new Date(year - 1, month - 1, 1).toISOString().slice(0, 7);

    const mesesTrimestre = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      mesesTrimestre.push(d.toISOString().slice(0, 7));
    }

    // 2. Filtro Vendedor (Identificador prioritario: ID, secundario: RUT)
    let filterValue = null;
    let filterType = 'id'; // 'id' o 'rut_idx'

    if (isManager && req.query.vendedor_id) {
      filterValue = req.query.vendedor_id;
      filterType = isNaN(filterValue) ? 'rut_idx' : 'id';
    } else if (!isManager) {
      filterValue = user.id;
      filterType = 'id';
    }

    const cleanFilterValue = (filterType === 'rut_idx' && filterValue) 
      ? filterValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
      : filterValue;

    // 3. Ejecutar Consultas con Gestión de Parámetros Limpia

    // Función local para simplificar la obtención de SUM de una tabla
    const getSum = async (table, dateCol, amountExpr, months, val, type = 'id') => {
      const qParams = [];
      let where = ' WHERE 1=1';

      // Filtro Meses o Día Exacto
      if (Array.isArray(months)) {
        const placeholders = months.map((m, i) => {
          qParams.push(m);
          return `$${qParams.length}`;
        }).join(',');
        where += ` AND TO_CHAR(t.${dateCol}, 'YYYY-MM') IN (${placeholders})`;
      } else if (months.length === 10) { // YYYY-MM-DD
        qParams.push(months);
        where += ` AND TO_CHAR(t.${dateCol}, 'YYYY-MM-DD') = $${qParams.length}`;
      } else {
        qParams.push(months);
        where += ` AND TO_CHAR(t.${dateCol}, 'YYYY-MM') = $${qParams.length}`;
      }

      let sql;
      if (val) {
        qParams.push(val);
        sql = `
                SELECT COALESCE(SUM(${amountExpr}), 0) as total
                FROM ${table} t
                INNER JOIN cliente c ON (t.rut_idx = c.rut_idx OR (t.rut_idx IS NULL AND t.nombre_idx = c.nombre_idx))
                LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
                ${where} AND u.${type} = $${qParams.length}
            `;
      } else {
        // Vista Global: Consulta Directa (Mucho más rápida y segura)
        sql = `SELECT COALESCE(SUM(${amountExpr}), 0) as total FROM ${table} t ${where}`;
      }

      const result = await pool.query(sql, qParams);
      return parseFloat(result.rows[0]?.total || 0);
    };

    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const montoVentasMes = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', mesActual, cleanFilterValue, filterType);
    const montoVentasAnioAnt = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', mesAnioAnterior, cleanFilterValue, filterType);
    const montoAbonosMes = await getSum(ABONOS_TABLE, 'fecha', 'COALESCE(t.monto_neto, t.monto / 1.19)', mesActual, cleanFilterValue, filterType);
    const montoVentasTrimestre = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', mesesTrimestre, cleanFilterValue, filterType);
    const montoVentasHoy = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', hoy, cleanFilterValue, filterType);

    // Clientes con Venta (Lógica aparte por ser COUNT DISTINCT)
    const getClientCount = async (monthVal, val, type = 'id') => {
      const qParams = [monthVal];
      let where = ` WHERE TO_CHAR(t.${SALES_DATE_COL}, 'YYYY-MM') = $1`;

      let sql;
      if (val) {
        qParams.push(val);
        sql = `
                SELECT COUNT(DISTINCT CASE WHEN t.identificador IS NOT NULL THEN t.identificador ELSE t.cliente END) as count
                FROM ${SALES_TABLE} t
                INNER JOIN cliente c ON (t.rut_idx = c.rut_idx OR (t.rut_idx IS NULL AND t.nombre_idx = c.nombre_idx))
                LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
                ${where} AND u.${type} = $2
            `;
      } else {
        sql = `SELECT COUNT(DISTINCT t.identificador) as count FROM ${SALES_TABLE} t ${where}`;
      }

      const result = await pool.query(sql, qParams);
      return parseInt(result.rows[0]?.count || 0);
    };
    const numClientes = await getClientCount(mesActual, cleanFilterValue, filterType);

    // Variación
    let variacionPct = 0;
    if (montoVentasAnioAnt > 0) {
      variacionPct = ((montoVentasMes - montoVentasAnioAnt) / montoVentasAnioAnt) * 100;
    } else if (montoVentasMes > 0) {
      variacionPct = 100;
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.json({
      success: true,
      data: {
        monto_ventas_mes: montoVentasMes,
        monto_ventas_hoy: montoVentasHoy,
        monto_ventas_anio_anterior: montoVentasAnioAnt,
        monto_abonos_mes: montoAbonosMes,
        variacion_vs_anio_anterior_pct: variacionPct,
        promedio_ventas_trimestre_anterior: montoVentasTrimestre / 3,
        numero_clientes_con_venta_mes: numClientes,
        mes_consultado: mesActual
      }
    });

  } catch (err) {
    console.error('Error en /api/kpis/dashboard-current:', err.message);
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/kpis/ranking-vendedores
router.get('/ranking-vendedores', auth(), async (req, res) => {
  try {
    const user = req.user;
    if (user.rol !== 'MANAGER') return res.status(403).json({ success: false, message: 'Forbidden' });

    const mesActual = await getUltimoMesConDatos();
    const [currY, currM] = mesActual.split('-').map(Number);

    const periodCurrent = mesActual;
    const periodPrevYear = new Date(currY - 1, currM - 1, 1).toISOString().slice(0, 7);

    const prevQuarterMonths = [];
    for (let i = 1; i <= 3; i++) {
      prevQuarterMonths.push(new Date(currY, currM - 1 - i, 1).toISOString().slice(0, 7));
    }

    const query = `
        WITH sales_stats AS (
          SELECT 
            vendedor_cliente,
            SUM(CASE WHEN TO_CHAR(fecha_emision, 'YYYY-MM') = $1 THEN valor_total ELSE 0 END) as ventas_mes_actual,
            SUM(CASE WHEN TO_CHAR(fecha_emision, 'YYYY-MM') = $2 THEN valor_total ELSE 0 END) as ventas_anio_anterior,
            SUM(CASE WHEN TO_CHAR(fecha_emision, 'YYYY-MM') IN ($3, $4, $5) THEN valor_total ELSE 0 END) as ventas_trimestre_ant
          FROM ${SALES_TABLE}
          WHERE vendedor_cliente IS NOT NULL
          GROUP BY vendedor_cliente
        ),
        abono_stats AS (
          SELECT 
            vendedor_cliente,
            SUM(CASE WHEN TO_CHAR(fecha, 'YYYY-MM') = $1 THEN COALESCE(monto_neto, monto / 1.19) ELSE 0 END) as abonos_mes_actual
          FROM ${ABONOS_TABLE}
          WHERE vendedor_cliente IS NOT NULL
          GROUP BY vendedor_cliente
        ),
        combined_stats AS (
          SELECT 
            COALESCE(s.vendedor_cliente, a.vendedor_cliente) as vendedor_nombre,
            COALESCE(s.ventas_mes_actual, 0) as ventas_mes_actual,
            COALESCE(a.abonos_mes_actual, 0) as abonos_mes_actual,
            COALESCE(s.ventas_trimestre_ant, 0) as ventas_trimestre_ant,
            COALESCE(s.ventas_anio_anterior, 0) as ventas_anio_anterior
          FROM sales_stats s
          FULL OUTER JOIN abono_stats a ON s.vendedor_cliente = a.vendedor_cliente
        )
        SELECT 
          u.rut,
          cs.vendedor_nombre as nombre_vendedor,
          cs.ventas_mes_actual,
          cs.abonos_mes_actual,
          cs.ventas_trimestre_ant / 3 as prom_ventas_trimestre_ant,
          cs.ventas_anio_anterior
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
      `;

    const result = await pool.query(query, [periodCurrent, periodPrevYear, ...prevQuarterMonths]);

    res.json({
      success: true,
      period: periodCurrent,
      data: result.rows.map(r => ({
        ...r,
        ventas_mes_actual: parseFloat(r.ventas_mes_actual),
        abonos_mes_actual: parseFloat(r.abonos_mes_actual),
        prom_ventas_trimestre_ant: parseFloat(r.prom_ventas_trimestre_ant),
        ventas_anio_anterior: parseFloat(r.ventas_anio_anterior)
      }))
    });

  } catch (err) {
    console.error('Error in ranking-vendedores:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/kpis/saldo-credito-total
router.get('/saldo-credito-total', auth(), async (req, res) => {
  try {
    const user = req.user;
    const isManager = (user.rol || '').toUpperCase() === 'MANAGER';

    let sql = 'SELECT COALESCE(SUM(saldo_factura), 0) AS total FROM saldo_credito s';
    const qParams = [];

    // Filtro Vendedor (Identificador prioritario: ID, secundario: RUT)
    let filterValue = null;
    let filterType = 'id';

    if (isManager && req.query.vendedor_id) {
      filterValue = req.query.vendedor_id;
      filterType = isNaN(filterValue) ? 'rut_idx' : 'id';
    } else if (!isManager) {
      filterValue = user.id;
      filterType = 'id';
    }

    const cleanFilterValue = (filterType === 'rut_idx' && filterValue) 
      ? filterValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
      : filterValue;

    if (filterValue) {
      sql = `
        SELECT COALESCE(SUM(sc.saldo_factura), 0) AS total 
        FROM saldo_credito sc
        INNER JOIN cliente c ON sc.rut_idx = c.rut_idx
        LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
        WHERE u.${filterType} = $1
      `;
      qParams.push(cleanFilterValue);
    }

    const result = await pool.query(sql, qParams);
    res.json({ success: true, data: { total_saldo_credito: parseFloat(result.rows[0]?.total || 0) } });
  } catch (err) {
    console.error('Error en saldo-credito-total:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mes-actual', auth(), async (req, res) => {
  return res.redirect('/api/kpis/dashboard-current');
});

router.get('/top-clients', auth(), async (req, res) => {
  try {
    const user = req.user;
    const isManager = (user.rol || '').toUpperCase() === 'MANAGER';
    
    // Filtro Vendedor (Identificador prioritario: ID)
    let filterValue = null;
    let filterType = 'id';

    if (isManager && req.query.vendedor_id) {
      filterValue = req.query.vendedor_id;
      filterType = isNaN(filterValue) ? 'rut_idx' : 'id';
    } else if (!isManager) {
      filterValue = user.id;
      filterType = 'id';
    }

    const cleanFilterValue = (filterType === 'rut_idx' && filterValue) 
      ? filterValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
      : filterValue;

    let sql = `
            SELECT c.nombre, SUM(s.${SALES_AMOUNT_COL}) AS total_sales
            FROM ${SALES_TABLE} s
            INNER JOIN cliente c ON (s.rut_idx = c.rut_idx OR (s.rut_idx IS NULL AND s.nombre_idx = c.nombre_idx))
            ${filterValue ? `
            LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
            WHERE u.${filterType} = $1` : ''}
            GROUP BY c.nombre ORDER BY total_sales DESC LIMIT 5
        `;
    const result = filterValue ? await pool.query(sql, [cleanFilterValue]) : await pool.query(sql);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/evolucion-mensual', auth(), async (req, res) => {
  try {
    const user = req.user;
    const isManager = (user.rol || '').toUpperCase() === 'MANAGER';
    const mesesAtras = parseInt(req.query.meses) || 12;

    // Filtro Vendedor (Identificador prioritario: ID, secundario: RUT)
    let filterValue = null;
    let filterType = 'id';

    if (isManager && req.query.vendedor_id) {
      filterValue = req.query.vendedor_id;
      filterType = isNaN(filterValue) ? 'rut_idx' : 'id';
    } else if (!isManager) {
      filterValue = user.id;
      filterType = 'id';
    }

    const cleanFilterValue = (filterType === 'rut_idx' && filterValue) 
      ? filterValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
      : filterValue;

    const queryVentas = `
        SELECT TO_CHAR(s.${SALES_DATE_COL}, 'YYYY-MM') AS mes, SUM(s.${SALES_AMOUNT_COL}) AS ventas
        FROM ${SALES_TABLE} s
        ${filterValue ? `INNER JOIN cliente c ON (s.rut_idx = c.rut_idx OR (s.rut_idx IS NULL AND s.nombre_idx = c.nombre_idx))
        JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut) AND u.${filterType} = $1` : ''}
        GROUP BY 1 ORDER BY mes DESC LIMIT ${mesesAtras}
      `;
    const vRes = filterValue ? await pool.query(queryVentas, [cleanFilterValue]) : await pool.query(queryVentas);

    const queryAbonos = `
        SELECT TO_CHAR(a.fecha, 'YYYY-MM') AS mes, SUM(COALESCE(a.monto_neto, a.monto/1.19)) AS abonos
        FROM ${ABONOS_TABLE} a
        ${filterValue ? `INNER JOIN cliente c ON (a.rut_idx = c.rut_idx OR (a.rut_idx IS NULL AND a.nombre_idx = c.nombre_idx))
        JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut) AND u.${filterType} = $1` : ''}
        GROUP BY 1 ORDER BY mes DESC LIMIT ${mesesAtras}
      `;
    const aRes = filterValue ? await pool.query(queryAbonos, [cleanFilterValue]) : await pool.query(queryAbonos);

    const abonosMap = {}; aRes.rows.forEach(r => abonosMap[r.mes] = parseFloat(r.abonos));
    const resData = vRes.rows.map(r => ({ mes: r.mes, ventas: parseFloat(r.ventas), abonos: abonosMap[r.mes] || 0 })).reverse();
    res.json(resData);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/ventas-por-familia', auth(), async (req, res) => {
  try {
    const query = `
            SELECT p.familia, SUM(s.${SALES_AMOUNT_COL}) as total
            FROM ${SALES_TABLE} s
            JOIN producto p ON s.codigo_producto = p.codigo_producto
            GROUP BY 1 ORDER BY total DESC LIMIT 10
        `;
    const result = await pool.query(query);
    res.json(result.rows.map(r => ({ familia: r.familia, total: parseFloat(r.total) })));
  } catch (err) { res.json([]); }
});

router.get('/evolucion-yoy', auth(), async (req, res) => {
  try {
    const user = req.user;
    const isManager = (user.rol || '').toUpperCase() === 'MANAGER';
    const mesesAtras = parseInt(req.query.meses) || 6;

    // Filtro Vendedor (Identificador prioritario: ID, secundario: RUT)
    let filterValue = null;
    let filterType = 'id';

    if (isManager && req.query.vendedor_id) {
      filterValue = req.query.vendedor_id;
      filterType = isNaN(filterValue) ? 'rut_idx' : 'id';
    } else if (!isManager) {
      filterValue = user.id;
      filterType = 'id';
    }

    const cleanFilterValue = (filterType === 'rut_idx' && filterValue) 
      ? filterValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
      : filterValue;

    const query = `
      WITH meses AS (
        SELECT mes FROM generate_series(
          date_trunc('month', CURRENT_DATE) - interval '${mesesAtras} months',
          date_trunc('month', CURRENT_DATE) - interval '1 month',
          interval '1 month'
        ) as mes
      ),
      ventas_agrupadas AS (
        SELECT 
          TO_CHAR(s.${SALES_DATE_COL}, 'YYYY-MM') as periodo,
          SUM(s.${SALES_AMOUNT_COL}) as total_ventas
        FROM ${SALES_TABLE} s
        ${filterValue ? `
        INNER JOIN cliente c ON (s.rut_idx = c.rut_idx OR (s.rut_idx IS NULL AND s.nombre_idx = c.nombre_idx))
        JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
        WHERE u.${filterType} = $1
        ` : ''}
        GROUP BY 1
      )
      SELECT 
        TO_CHAR(m.mes, 'YYYY-MM') as mes_actual_str,
        TO_CHAR(m.mes - interval '1 year', 'YYYY-MM') as mes_anterior_str,
        COALESCE(va_actual.total_ventas, 0) as ventas_actual,
        COALESCE(va_ant.total_ventas, 0) as ventas_anterior
      FROM meses m
      LEFT JOIN ventas_agrupadas va_actual ON TO_CHAR(m.mes, 'YYYY-MM') = va_actual.periodo
      LEFT JOIN ventas_agrupadas va_ant ON TO_CHAR(m.mes - interval '1 year', 'YYYY-MM') = va_ant.periodo
      ORDER BY m.mes ASC;
    `;
    
    const result = filterValue ? await pool.query(query, [cleanFilterValue]) : await pool.query(query);
    res.json(result.rows);
  } catch (err) { 
    console.error('Error in /evolucion-yoy:', err);
    res.status(500).send('Server Error'); 
  }
});

module.exports = router;
