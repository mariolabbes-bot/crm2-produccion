const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/abonos - Obtener abonos con filtros
router.get('/', auth(), async (req, res) => {
  try {
    const { 
      vendedor_id, 
      fecha_desde, 
      fecha_hasta, 
      tipo_pago,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = `
      SELECT 
        a.id,
        a.folio,
        a.fecha_abono,
        a.monto,
        a.tipo_pago,
        a.cliente_nombre,
        a.descripcion,
        u.nombre as vendedor_nombre,
        u.id as vendedor_id
  FROM abonos a
      LEFT JOIN users u ON a.vendedor_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCounter = 1;

    // Control de acceso: vendedores solo ven sus propios abonos
    if (req.user.rol === 'vendedor') {
      query += ` AND a.vendedor_id = $${paramCounter}`;
      params.push(req.user.id);
      paramCounter++;
    } else if (vendedor_id) {
      // Manager puede filtrar por vendedor
      query += ` AND a.vendedor_id = $${paramCounter}`;
      params.push(vendedor_id);
      paramCounter++;
    }

    // Filtro por rango de fechas
    if (fecha_desde) {
      query += ` AND a.fecha_abono >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      query += ` AND a.fecha_abono <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Filtro por tipo de pago
    if (tipo_pago) {
      query += ` AND a.tipo_pago = $${paramCounter}`;
      params.push(tipo_pago);
      paramCounter++;
    }

    query += ` ORDER BY a.fecha_abono DESC, a.id DESC`;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Obtener el total de registros para paginación
    let countQuery = `
      SELECT COUNT(*) as total
  FROM abonos a
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCounter = 1;

    if (req.user.rol === 'vendedor') {
      countQuery += ` AND a.vendedor_id = $${countParamCounter}`;
      countParams.push(req.user.id);
      countParamCounter++;
    } else if (vendedor_id) {
      countQuery += ` AND a.vendedor_id = $${countParamCounter}`;
      countParams.push(vendedor_id);
      countParamCounter++;
    }

    if (fecha_desde) {
      countQuery += ` AND a.fecha_abono >= $${countParamCounter}`;
      countParams.push(fecha_desde);
      countParamCounter++;
    }

    if (fecha_hasta) {
      countQuery += ` AND a.fecha_abono <= $${countParamCounter}`;
      countParams.push(fecha_hasta);
      countParamCounter++;
    }

    if (tipo_pago) {
      countQuery += ` AND a.tipo_pago = $${countParamCounter}`;
      countParams.push(tipo_pago);
      countParamCounter++;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo abonos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener abonos',
      error: error.message 
    });
  }
});

// GET /api/abonos/estadisticas - Estadísticas de abonos
router.get('/estadisticas', auth(), async (req, res) => {
  try {
    const { vendedor_id, fecha_desde, fecha_hasta } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    // Control de acceso
    if (req.user.rol === 'vendedor') {
      whereClause += ` AND a.vendedor_id = $${paramCounter}`;
      params.push(req.user.id);
      paramCounter++;
    } else if (vendedor_id) {
      whereClause += ` AND a.vendedor_id = $${paramCounter}`;
      params.push(vendedor_id);
      paramCounter++;
    }

    if (fecha_desde) {
      whereClause += ` AND a.fecha_abono >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      whereClause += ` AND a.fecha_abono <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Estadísticas generales
    const statsQuery = `
      SELECT 
        COUNT(*) as total_abonos,
        SUM(monto) as monto_total,
        AVG(monto) as promedio_abono,
        MIN(monto) as abono_minimo,
        MAX(monto) as abono_maximo,
        MIN(fecha_abono) as fecha_primera,
        MAX(fecha_abono) as fecha_ultima
  FROM abonos a
      ${whereClause}
    `;

    // Por tipo de pago
    const tipoPagoQuery = `
      SELECT 
        COALESCE(tipo_pago, 'Sin especificar') as tipo_pago,
        COUNT(*) as cantidad,
        SUM(monto) as monto_total,
        AVG(monto)::numeric(15,2) as promedio
  FROM abonos a
      ${whereClause}
      GROUP BY tipo_pago
      ORDER BY monto_total DESC
    `;

    // Por mes
    const porMesQuery = `
      SELECT 
        TO_CHAR(fecha_abono, 'YYYY-MM') as mes,
        COUNT(*) as cantidad,
        SUM(monto) as monto_total,
        AVG(monto)::numeric(15,2) as promedio
  FROM abonos a
      ${whereClause}
      GROUP BY TO_CHAR(fecha_abono, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12
    `;

    const [stats, tipoPago, porMes] = await Promise.all([
      pool.query(statsQuery, params),
      pool.query(tipoPagoQuery, params),
      pool.query(porMesQuery, params)
    ]);

    res.json({
      success: true,
      data: {
        resumen: stats.rows[0],
        por_tipo_pago: tipoPago.rows,
        por_mes: porMes.rows
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de abonos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estadísticas',
      error: error.message 
    });
  }
});

// GET /api/abonos/comparativo - Comparativo ventas vs abonos
router.get('/comparativo', auth(), async (req, res) => {
  try {
    const { vendedor_id, fecha_desde, fecha_hasta, agrupar = 'mes' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    // Control de acceso
    if (req.user.rol === 'vendedor') {
      whereClause += ` AND vendedor_id = $${paramCounter}`;
      params.push(req.user.id);
      paramCounter++;
    } else if (vendedor_id) {
      whereClause += ` AND vendedor_id = $${paramCounter}`;
      params.push(vendedor_id);
      paramCounter++;
    }

    if (fecha_desde) {
      whereClause += ` AND fecha >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      whereClause += ` AND fecha <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Determinar formato de agrupación
    let dateFormat;
    switch (agrupar) {
      case 'dia':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'mes':
        dateFormat = 'YYYY-MM';
        break;
      case 'anio':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM';
    }

    const comparativoQuery = `
      WITH ventas_agrupadas AS (
        SELECT 
          TO_CHAR(fecha_emision, '${dateFormat}') as periodo,
          vendedor_id,
          SUM(total_venta) as total_ventas,
          COUNT(*) as cantidad_ventas
        FROM sales
        ${whereClause.replace('fecha', 'fecha_emision')}
        GROUP BY TO_CHAR(fecha_emision, '${dateFormat}'), vendedor_id
      ),
      abonos_agrupados AS (
        SELECT 
          TO_CHAR(fecha_abono, '${dateFormat}') as periodo,
          vendedor_id,
          SUM(monto) as total_abonos,
          COUNT(*) as cantidad_abonos
  FROM abonos
        ${whereClause.replace('fecha', 'fecha_abono')}
        GROUP BY TO_CHAR(fecha_abono, '${dateFormat}'), vendedor_id
      )
      SELECT 
        COALESCE(v.periodo, a.periodo) as periodo,
        COALESCE(v.vendedor_id, a.vendedor_id) as vendedor_id,
        u.nombre as vendedor_nombre,
        COALESCE(v.total_ventas, 0) as total_ventas,
        COALESCE(v.cantidad_ventas, 0) as cantidad_ventas,
        COALESCE(a.total_abonos, 0) as total_abonos,
        COALESCE(a.cantidad_abonos, 0) as cantidad_abonos,
        COALESCE(v.total_ventas, 0) - COALESCE(a.total_abonos, 0) as diferencia,
        CASE 
          WHEN COALESCE(v.total_ventas, 0) > 0 
          THEN (COALESCE(a.total_abonos, 0) / COALESCE(v.total_ventas, 0) * 100)::numeric(5,2)
          ELSE 0 
        END as porcentaje_cobrado
      FROM ventas_agrupadas v
      FULL OUTER JOIN abonos_agrupados a ON v.periodo = a.periodo AND v.vendedor_id = a.vendedor_id
      LEFT JOIN users u ON COALESCE(v.vendedor_id, a.vendedor_id) = u.id
      ORDER BY periodo DESC, vendedor_nombre
    `;

    const result = await pool.query(comparativoQuery, params);

    // Resumen total
    const resumenQuery = `
      WITH ventas_total AS (
        SELECT 
          SUM(total_venta) as total_ventas,
          COUNT(*) as cantidad_ventas
        FROM sales
        ${whereClause.replace('fecha', 'fecha_emision')}
      ),
      abonos_total AS (
        SELECT 
          SUM(monto) as total_abonos,
          COUNT(*) as cantidad_abonos
  FROM abonos
        ${whereClause.replace('fecha', 'fecha_abono')}
      )
      SELECT 
        v.total_ventas,
        v.cantidad_ventas,
        a.total_abonos,
        a.cantidad_abonos,
        v.total_ventas - a.total_abonos as saldo_pendiente,
        CASE 
          WHEN v.total_ventas > 0 
          THEN (a.total_abonos / v.total_ventas * 100)::numeric(5,2)
          ELSE 0 
        END as porcentaje_cobrado_total
      FROM ventas_total v, abonos_total a
    `;

    const resumen = await pool.query(resumenQuery, params);

    res.json({
      success: true,
      data: {
        resumen: resumen.rows[0],
        detalle: result.rows
      }
    });
  } catch (error) {
    console.error('Error obteniendo comparativo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener comparativo',
      error: error.message 
    });
  }
});

// GET /api/abonos/por-vendedor - Resumen por vendedor
router.get('/por-vendedor', auth(), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    // Solo managers pueden ver todos los vendedores
    if (req.user.rol !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta información'
      });
    }

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    if (fecha_desde) {
      whereClause += ` AND a.fecha_abono >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      whereClause += ` AND a.fecha_abono <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    const query = `
      SELECT 
        u.id as vendedor_id,
        u.nombre as vendedor_nombre,
        COUNT(a.id) as cantidad_abonos,
        SUM(a.monto) as total_abonos,
        AVG(a.monto)::numeric(15,2) as promedio_abono,
        MIN(a.fecha_abono) as primer_abono,
        MAX(a.fecha_abono) as ultimo_abono,
        -- Ventas del vendedor
        (
          SELECT COUNT(*) 
          FROM sales s 
          WHERE s.vendedor_id = u.id 
          ${fecha_desde ? `AND s.fecha_emision >= $1` : ''}
          ${fecha_hasta ? `AND s.fecha_emision <= $${fecha_desde ? 2 : 1}` : ''}
        ) as cantidad_ventas,
        (
          SELECT COALESCE(SUM(total_venta), 0) 
          FROM sales s 
          WHERE s.vendedor_id = u.id
          ${fecha_desde ? `AND s.fecha_emision >= $1` : ''}
          ${fecha_hasta ? `AND s.fecha_emision <= $${fecha_desde ? 2 : 1}` : ''}
        ) as total_ventas
  FROM users u
  LEFT JOIN abonos a ON u.id = a.vendedor_id ${whereClause.replace('WHERE 1=1 AND', 'AND')}
      WHERE u.rol IN ('vendedor', 'manager')
      GROUP BY u.id, u.nombre
      ORDER BY total_abonos DESC NULLS LAST
    `;

    const result = await pool.query(query, params);

    // Calcular porcentajes y agregar métricas
    const vendedoresConMetricas = result.rows.map(v => ({
      ...v,
      porcentaje_cobrado: v.total_ventas > 0 
        ? ((v.total_abonos / v.total_ventas) * 100).toFixed(2)
        : '0.00',
      saldo_pendiente: (parseFloat(v.total_ventas || 0) - parseFloat(v.total_abonos || 0)).toFixed(2)
    }));

    res.json({
      success: true,
      data: vendedoresConMetricas
    });
  } catch (error) {
    console.error('Error obteniendo abonos por vendedor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener información',
      error: error.message 
    });
  }
});

// GET /api/abonos/tipos-pago - Lista de tipos de pago disponibles
router.get('/tipos-pago', auth(), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT tipo_pago
  FROM abonos
      WHERE tipo_pago IS NOT NULL
      ORDER BY tipo_pago
    `);

    res.json({
      success: true,
      data: result.rows.map(r => r.tipo_pago)
    });
  } catch (error) {
    console.error('Error obteniendo tipos de pago:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener tipos de pago',
      error: error.message 
    });
  }
});

module.exports = router;
