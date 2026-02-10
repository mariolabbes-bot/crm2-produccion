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

// @route   GET /api/kpis/debug-dashboard
// @desc    Diagnóstico público para dashboard
router.get('/debug-dashboard', async (req, res) => {
  try {
    const mesActual = await getUltimoMesConDatos();
    const salesTotal = await pool.query(`SELECT SUM(valor_total) as total FROM venta WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $1`, [mesActual]);
    const abonosTotal = await pool.query(`SELECT SUM(COALESCE(monto_neto, monto/1.19)) as total FROM abono WHERE TO_CHAR(fecha, 'YYYY-MM') = $1`, [mesActual]);
    const counts = await pool.query(`SELECT (SELECT count(*) FROM venta) as v, (SELECT count(*) FROM abono) as a`);

    res.json({
      mesActual,
      salesSum: salesTotal.rows[0].total,
      abonosSum: abonosTotal.rows[0].total,
      ventaCount: counts.rows[0].v,
      abonoCount: counts.rows[0].a,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

    // 2. Filtro Vendedor (RUT)
    let targetRut = null;
    if (isManager && req.query.vendedor_id) {
      targetRut = req.query.vendedor_id; // El frontend envía el RUT como ID
    } else if (!isManager) {
      targetRut = user.rut;
    }

    // 3. Ejecutar Consultas con Gestión de Parámetros Limpia

    // Función local para simplificar la obtención de SUM de una tabla
    const getSum = async (table, dateCol, amountExpr, months, rut) => {
      const qParams = [];
      let where = ' WHERE 1=1';

      // Filtro Meses
      if (Array.isArray(months)) {
        const placeholders = months.map((m, i) => {
          qParams.push(m);
          return `$${qParams.length}`;
        }).join(',');
        where += ` AND TO_CHAR(t.${dateCol}, 'YYYY-MM') IN (${placeholders})`;
      } else {
        qParams.push(months);
        where += ` AND TO_CHAR(t.${dateCol}, 'YYYY-MM') = $${qParams.length}`;
      }

      // Filtro Vendedor (por RUT)
      if (rut) {
        qParams.push(rut);
        where += ` AND COALESCE(u.rut, u2.rut) = $${qParams.length}`;
      }

      const sql = `
            SELECT COALESCE(SUM(${amountExpr}), 0) as total
            FROM ${table} t
            LEFT JOIN usuario u ON UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(t.vendedor_cliente))
            LEFT JOIN usuario u2 ON UPPER(TRIM(u2.alias)) = UPPER(TRIM(t.${table === 'venta' ? 'vendedor_documento' : 'vendedor_cliente'}))
            ${where}
        `;

      const result = await pool.query(sql, qParams);
      return parseFloat(result.rows[0]?.total || 0);
    };

    const montoVentasMes = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', mesActual, targetRut);
    const montoVentasAnioAnt = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', mesAnioAnterior, targetRut);
    const montoAbonosMes = await getSum(ABONOS_TABLE, 'fecha', 'COALESCE(t.monto_neto, t.monto / 1.19)', mesActual, targetRut);
    const montoVentasTrimestre = await getSum(SALES_TABLE, SALES_DATE_COL, 't.valor_total', mesesTrimestre, targetRut);

    // Clientes con Venta (Lógica aparte por ser COUNT DISTINCT)
    const getClientCount = async (monthVal, rut) => {
      const qParams = [monthVal];
      let where = ` WHERE TO_CHAR(t.${SALES_DATE_COL}, 'YYYY-MM') = $1`;
      if (rut) {
        qParams.push(rut);
        where += ` AND COALESCE(u.rut, u2.rut) = $2`;
      }
      const sql = `
            SELECT COUNT(DISTINCT t.identificador) as count
            FROM ${SALES_TABLE} t
            LEFT JOIN usuario u ON UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(t.vendedor_cliente))
            LEFT JOIN usuario u2 ON UPPER(TRIM(u2.alias)) = UPPER(TRIM(t.vendedor_documento))
            ${where}
        `;
      const result = await pool.query(sql, qParams);
      return parseInt(result.rows[0]?.count || 0);
    };
    const numClientes = await getClientCount(mesActual, targetRut);

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
            COALESCE(u.rut, u2.rut) as rut,
            SUM(CASE WHEN TO_CHAR(s.${SALES_DATE_COL}, 'YYYY-MM') = $1 THEN s.${SALES_AMOUNT_COL} ELSE 0 END) as ventas_mes_actual,
            SUM(CASE WHEN TO_CHAR(s.${SALES_DATE_COL}, 'YYYY-MM') = $2 THEN s.${SALES_AMOUNT_COL} ELSE 0 END) as ventas_anio_anterior,
            SUM(CASE WHEN TO_CHAR(s.${SALES_DATE_COL}, 'YYYY-MM') IN ($3, $4, $5) THEN s.${SALES_AMOUNT_COL} ELSE 0 END) as ventas_trimestre_ant
          FROM ${SALES_TABLE} s
          LEFT JOIN usuario u ON UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(s.vendedor_cliente))
          LEFT JOIN usuario u2 ON UPPER(TRIM(u2.alias)) = UPPER(TRIM(s.vendedor_documento))
          GROUP BY 1
        ),
        abono_stats AS (
          SELECT 
            COALESCE(u.rut, u2.rut) as rut,
            SUM(CASE WHEN TO_CHAR(a.fecha, 'YYYY-MM') = $1 THEN COALESCE(a.monto_neto, a.monto / 1.19) ELSE 0 END) as abonos_mes_actual
          FROM ${ABONOS_TABLE} a
          LEFT JOIN usuario u ON UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente))
          LEFT JOIN usuario u2 ON UPPER(TRIM(u2.alias)) = UPPER(TRIM(a.vendedor_cliente))
          GROUP BY 1
        )
        SELECT 
          u.rut,
          u.nombre_vendedor,
          COALESCE(s.ventas_mes_actual, 0) as ventas_mes_actual,
          COALESCE(a.abonos_mes_actual, 0) as abonos_mes_actual,
          COALESCE(s.ventas_trimestre_ant, 0) / 3 as prom_ventas_trimestre_ant,
          COALESCE(s.ventas_anio_anterior, 0) as ventas_anio_anterior
        FROM usuario u
        LEFT JOIN sales_stats s ON u.rut = s.rut
        LEFT JOIN abono_stats a ON u.rut = a.rut
        WHERE LOWER(u.rol_usuario) IN ('vendedor', 'manager')
        AND (u.alias IS NULL OR (u.alias NOT ILIKE '%_old' AND TRIM(u.alias) != ''))
        AND u.rut NOT ILIKE 'stub-%'
        AND TRIM(u.nombre_vendedor) != ''
        ORDER BY ventas_mes_actual DESC
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

    if (isManager && req.query.vendedor_id) {
      const uRes = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [req.query.vendedor_id]);
      if (uRes.rows[0]?.nombre_vendedor) {
        sql += ' WHERE UPPER(TRIM(s.nombre_vendedor)) = UPPER(TRIM($1))';
        qParams.push(uRes.rows[0].nombre_vendedor);
      }
    } else if (!isManager) {
      const name = user.nombre_vendedor || '';
      sql += ' WHERE UPPER(TRIM(s.nombre_vendedor)) = UPPER(TRIM($1))';
      qParams.push(name);
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
    const isManager = user.rol === 'MANAGER';
    let sql = `
            SELECT c.nombre, SUM(s.${SALES_AMOUNT_COL}) AS total_sales
            FROM ${SALES_TABLE} s
            JOIN cliente c ON s.identificador = c.rut
            ${!isManager ? 'WHERE c.vendedor_id = $1' : ''}
            GROUP BY c.nombre ORDER BY total_sales DESC LIMIT 5
        `;
    const result = isManager ? await pool.query(sql) : await pool.query(sql, [user.rut]);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

router.get('/evolucion-mensual', auth(), async (req, res) => {
  try {
    const user = req.user;
    const isManager = user.rol === 'MANAGER';
    const mesesAtras = parseInt(req.query.meses) || 12;

    const queryVentas = `
        SELECT TO_CHAR(${SALES_DATE_COL}, 'YYYY-MM') AS mes, SUM(${SALES_AMOUNT_COL}) AS ventas
        FROM ${SALES_TABLE} s
        LEFT JOIN usuario u ON UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(s.vendedor_cliente))
        LEFT JOIN usuario u2 ON UPPER(TRIM(u2.alias)) = UPPER(TRIM(s.vendedor_documento))
        WHERE 1=1 ${!isManager ? 'AND COALESCE(u.rut, u2.rut) = $1' : ''}
        GROUP BY 1 ORDER BY mes DESC LIMIT ${mesesAtras}
      `;
    const vRes = isManager ? await pool.query(queryVentas) : await pool.query(queryVentas, [user.rut]);

    const queryAbonos = `
        SELECT TO_CHAR(a.fecha, 'YYYY-MM') AS mes, SUM(COALESCE(a.monto_neto, a.monto/1.19)) AS abonos
        FROM ${ABONOS_TABLE} a
        LEFT JOIN usuario u ON UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente))
        LEFT JOIN usuario u2 ON UPPER(TRIM(u2.alias)) = UPPER(TRIM(a.vendedor_cliente))
        WHERE 1=1 ${!isManager ? 'AND COALESCE(u.rut, u2.rut) = $1' : ''}
        GROUP BY 1 ORDER BY mes DESC LIMIT ${mesesAtras}
      `;
    const aRes = isManager ? await pool.query(queryAbonos) : await pool.query(queryAbonos, [user.rut]);

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

module.exports = router;
