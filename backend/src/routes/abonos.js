const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Runtime detection of actual table names in the connected database
let detectedTables = null;
let detectedAt = 0;
async function getDetectedTables() {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  if (detectedTables && (Date.now() - detectedAt) < CACHE_TTL_MS) return detectedTables;

  const q = `
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abonos') AS has_abonos,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abono') AS has_abono,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') AS has_sales,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas') AS has_ventas,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'venta') AS has_venta
  `;
  const { rows } = await pool.query(q);
  const r = rows[0] || {};
  const abonosTable = r.has_abonos ? 'abonos' : (r.has_abono ? 'abono' : null);
  const salesTable = r.has_sales ? 'sales' : (r.has_ventas ? 'ventas' : (r.has_venta ? 'venta' : null));
  detectedTables = { abonosTable, salesTable };
  detectedAt = Date.now();
  return detectedTables;
}

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

    const { abonosTable } = await getDetectedTables();
    if (!abonosTable) {
      return res.status(500).json({ success: false, message: "Tabla de abonos no encontrada (abonos/abono) en la base de datos" });
    }

    // Detectar nombres de columnas
    const { rows: colRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = $1
    `, [abonosTable]);
    const cols = colRows.map(r => r.column_name);
    const fechaCol = cols.includes('fecha_abono') ? 'fecha_abono' : 'fecha';
    const montoCol = cols.includes('monto') && !cols.includes('monto_total') ? 'monto' : 'monto_total';
    const clienteCol = cols.includes('cliente_nombre') ? 'cliente_nombre' : 'cliente';

    let query = `
      SELECT 
        a.id,
        a.folio,
        a.${fechaCol} as fecha_abono,
        a.${montoCol} as monto,
        a.tipo_pago,
        a.${clienteCol} as cliente_nombre,
        a.identificador as descripcion,
        u.nombre as vendedor_nombre,
        u.id as vendedor_id
  FROM ${abonosTable} a
      LEFT JOIN usuario u ON a.vendedor_id = u.id
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
      query += ` AND a.${fechaCol} >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      query += ` AND a.${fechaCol} <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Filtro por tipo de pago
    if (tipo_pago) {
      query += ` AND a.tipo_pago = $${paramCounter}`;
      params.push(tipo_pago);
      paramCounter++;
    }

    query += ` ORDER BY a.${fechaCol} DESC, a.id DESC`;
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Obtener el total de registros para paginación
    let countQuery = `
      SELECT COUNT(*) as total
  FROM ${abonosTable} a
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
      countQuery += ` AND a.${fechaCol} >= $${countParamCounter}`;
      countParams.push(fecha_desde);
      countParamCounter++;
    }

    if (fecha_hasta) {
      countQuery += ` AND a.${fechaCol} <= $${countParamCounter}`;
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
    const { abonosTable } = await getDetectedTables();
    if (!abonosTable) {
      return res.status(500).json({ success: false, message: 'Tabla de abonos no encontrada (abonos/abono)' });
    }

    // Detectar nombres de columnas
    const { rows: colRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = $1
    `, [abonosTable]);
    const cols = colRows.map(r => r.column_name);
    const fechaCol = cols.includes('fecha_abono') ? 'fecha_abono' : 'fecha';
    const montoCol = cols.includes('monto') && !cols.includes('monto_total') ? 'monto' : 'monto_total';

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
      whereClause += ` AND a.${fechaCol} >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      whereClause += ` AND a.${fechaCol} <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Estadísticas generales
    const statsQuery = `
      SELECT 
        COUNT(*) as total_abonos,
        SUM(${montoCol}) as monto_total,
        AVG(${montoCol}) as promedio_abono,
        MIN(${montoCol}) as abono_minimo,
        MAX(${montoCol}) as abono_maximo,
        MIN(${fechaCol}) as fecha_primera,
        MAX(${fechaCol}) as fecha_ultima
  FROM ${abonosTable} a
      ${whereClause}
    `;

    // Por tipo de pago
    const tipoPagoQuery = `
      SELECT 
        COALESCE(tipo_pago, 'Sin especificar') as tipo_pago,
        COUNT(*) as cantidad,
        SUM(${montoCol}) as monto_total,
        AVG(${montoCol})::numeric(15,2) as promedio
  FROM ${abonosTable} a
      ${whereClause}
      GROUP BY tipo_pago
      ORDER BY monto_total DESC
    `;

    // Por mes
    const porMesQuery = `
      SELECT 
        TO_CHAR(${fechaCol}, 'YYYY-MM') as mes,
        COUNT(*) as cantidad,
        SUM(${montoCol}) as monto_total,
        AVG(${montoCol})::numeric(15,2) as promedio
  FROM ${abonosTable} a
      ${whereClause}
      GROUP BY TO_CHAR(${fechaCol}, 'YYYY-MM')
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
    const { abonosTable, salesTable } = await getDetectedTables();
    if (!abonosTable) {
      return res.status(500).json({ success: false, message: 'Tabla de abonos no encontrada (abonos/abono)' });
    }

    // Detectar columnas en tabla abonos
    const { rows: abonoColRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = $1
    `, [abonosTable]);
    const abonoCols = abonoColRows.map(r => r.column_name);
    const abonoFechaCol = abonoCols.includes('fecha_abono') ? 'fecha_abono' : 'fecha';
    const abonoMontoCol = abonoCols.includes('monto') && !abonoCols.includes('monto_total') ? 'monto' : 'monto_total';

    // Detect date column and amount column in sales table
    let salesDateCol = 'fecha_emision';
    let salesAmountCol = 'valor_total';
    if (salesTable) {
      const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [salesTable]);
      const cols = rows.map(r => r.column_name);
      // Date column
      if (cols.includes('fecha_emision')) salesDateCol = 'fecha_emision';
      else if (cols.includes('invoice_date')) salesDateCol = 'invoice_date';
      else if (cols.includes('fecha')) salesDateCol = 'fecha';
      // Amount column
      if (cols.includes('valor_total')) salesAmountCol = 'valor_total';
      else if (cols.includes('total_venta')) salesAmountCol = 'total_venta';
      else if (cols.includes('monto_total')) salesAmountCol = 'monto_total';
      else if (cols.includes('net_amount')) salesAmountCol = 'net_amount';
    }

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

    // Construir whereClause para ventas
    let whereClauseVentas = whereClause;
    if (fecha_desde) {
      whereClauseVentas += ` AND ${salesDateCol} >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      whereClauseVentas += ` AND ${salesDateCol} <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Construir whereClause para abonos (mismos parámetros pero con fecha_abono)
    let whereClauseAbonos = whereClause;
    const abonosParams = [];
    let abonosParamCounter = 1;
    
    if (req.user.rol === 'vendedor') {
      whereClauseAbonos += ` AND vendedor_id = $${abonosParamCounter}`;
      abonosParams.push(req.user.id);
      abonosParamCounter++;
    } else if (vendedor_id) {
      whereClauseAbonos += ` AND vendedor_id = $${abonosParamCounter}`;
      abonosParams.push(vendedor_id);
      abonosParamCounter++;
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

    const ventasCte = salesTable
      ? `SELECT 
          TO_CHAR(${salesDateCol}, '${dateFormat}') as periodo,
          vendedor_id,
          SUM(${salesAmountCol}) as total_ventas,
          COUNT(*) as cantidad_ventas
        FROM ${salesTable}
        ${whereClauseVentas}
        GROUP BY TO_CHAR(${salesDateCol}, '${dateFormat}'), vendedor_id`
      : `SELECT NULL::text as periodo, NULL::int as vendedor_id, 0::numeric as total_ventas, 0::bigint as cantidad_ventas WHERE 1=0`;

    const abonosCte = `SELECT 
          TO_CHAR(${abonoFechaCol}, '${dateFormat}') as periodo,
          vendedor_id,
          SUM(${abonoMontoCol}) as total_abonos,
          COUNT(*) as cantidad_abonos
        FROM ${abonosTable}
        ${whereClauseAbonos}
        GROUP BY TO_CHAR(${abonoFechaCol}, '${dateFormat}'), vendedor_id`;

    // Ejecutar consultas por separado ya que tienen diferentes parámetros
    const ventasData = salesTable ? await pool.query(`
      SELECT 
        TO_CHAR(${salesDateCol}, '${dateFormat}') as periodo,
        vendedor_id,
        SUM(${salesAmountCol}) as total_ventas,
        COUNT(*) as cantidad_ventas
      FROM ${salesTable}
      ${whereClauseVentas}
      GROUP BY TO_CHAR(${salesDateCol}, '${dateFormat}'), vendedor_id
    `, params) : { rows: [] };

    const abonosData = await pool.query(`
      SELECT 
        TO_CHAR(${abonoFechaCol}, '${dateFormat}') as periodo,
        vendedor_id,
        SUM(${abonoMontoCol}) as total_abonos,
        COUNT(*) as cantidad_abonos
      FROM ${abonosTable}
      ${whereClauseAbonos}
      GROUP BY TO_CHAR(${abonoFechaCol}, '${dateFormat}'), vendedor_id
    `, abonosParams);

    // Combinar resultados en memoria
    const periodoVendedorMap = new Map();

    // Procesar ventas
    ventasData.rows.forEach(row => {
      const key = `${row.periodo}-${row.vendedor_id}`;
      periodoVendedorMap.set(key, {
        periodo: row.periodo,
        vendedor_id: row.vendedor_id,
        total_ventas: parseFloat(row.total_ventas) || 0,
        cantidad_ventas: parseInt(row.cantidad_ventas) || 0,
        total_abonos: 0,
        cantidad_abonos: 0
      });
    });

    // Procesar abonos
    abonosData.rows.forEach(row => {
      const key = `${row.periodo}-${row.vendedor_id}`;
      if (periodoVendedorMap.has(key)) {
        const existing = periodoVendedorMap.get(key);
        existing.total_abonos = parseFloat(row.total_abonos) || 0;
        existing.cantidad_abonos = parseInt(row.cantidad_abonos) || 0;
      } else {
        periodoVendedorMap.set(key, {
          periodo: row.periodo,
          vendedor_id: row.vendedor_id,
          total_ventas: 0,
          cantidad_ventas: 0,
          total_abonos: parseFloat(row.total_abonos) || 0,
          cantidad_abonos: parseInt(row.cantidad_abonos) || 0
        });
      }
    });

    // Obtener nombres de vendedores
    const vendedorIds = [...new Set([...periodoVendedorMap.values()].map(v => v.vendedor_id))];
    const usuariosData = vendedorIds.length > 0 ? await pool.query(`
      SELECT id, nombre FROM usuario WHERE id = ANY($1)
    `, [vendedorIds]) : { rows: [] };

    const vendedorNombres = new Map(usuariosData.rows.map(u => [u.id, u.nombre]));

    // Construir resultado final
    const result = {
      rows: [...periodoVendedorMap.values()].map(row => ({
        ...row,
        vendedor_nombre: vendedorNombres.get(row.vendedor_id) || 'Desconocido',
        diferencia: row.total_ventas - row.total_abonos,
        porcentaje_cobrado: row.total_ventas > 0 
          ? parseFloat(((row.total_abonos / row.total_ventas) * 100).toFixed(2))
          : 0
      })).sort((a, b) => {
        if (b.periodo !== a.periodo) return b.periodo.localeCompare(a.periodo);
        return a.vendedor_nombre.localeCompare(b.vendedor_nombre);
      })
    };

    // Resumen total - también con consultas separadas
    const ventasTotalData = salesTable ? await pool.query(`
      SELECT 
        SUM(total_venta) as total_ventas,
        COUNT(*) as cantidad_ventas
      FROM ${salesTable}
      ${whereClauseVentas}
    `, params) : { rows: [{ total_ventas: 0, cantidad_ventas: 0 }] };

    const abonosTotalData = await pool.query(`
      SELECT 
        SUM(monto) as total_abonos,
        COUNT(*) as cantidad_abonos
      FROM ${abonosTable}
      ${whereClauseAbonos}
    `, abonosParams);

    const ventasTotal = parseFloat(ventasTotalData.rows[0]?.total_ventas) || 0;
    const abonosTotal = parseFloat(abonosTotalData.rows[0]?.total_abonos) || 0;

    const resumen = {
      rows: [{
        total_ventas: ventasTotal,
        cantidad_ventas: parseInt(ventasTotalData.rows[0]?.cantidad_ventas) || 0,
        total_abonos: abonosTotal,
        cantidad_abonos: parseInt(abonosTotalData.rows[0]?.cantidad_abonos) || 0,
        saldo_pendiente: ventasTotal - abonosTotal,
        porcentaje_cobrado_total: ventasTotal > 0 
          ? parseFloat(((abonosTotal / ventasTotal) * 100).toFixed(2))
          : 0
      }]
    };

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
    const { abonosTable, salesTable } = await getDetectedTables();
    if (!abonosTable) {
      return res.status(500).json({ success: false, message: 'Tabla de abonos no encontrada (abonos/abono)' });
    }

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

    const ventasCantidadSub = salesTable
      ? `SELECT COUNT(*) FROM ${salesTable} s WHERE s.vendedor_id = u.id ${fecha_desde ? `AND s.fecha_emision >= $1` : ''} ${fecha_hasta ? `AND s.fecha_emision <= $${fecha_desde ? 2 : 1}` : ''}`
      : `SELECT 0`;
    const ventasTotalSub = salesTable
      ? `SELECT COALESCE(SUM(total_venta), 0) FROM ${salesTable} s WHERE s.vendedor_id = u.id ${fecha_desde ? `AND s.fecha_emision >= $1` : ''} ${fecha_hasta ? `AND s.fecha_emision <= $${fecha_desde ? 2 : 1}` : ''}`
      : `SELECT 0`;

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
        ( ${ventasCantidadSub} ) as cantidad_ventas,
        ( ${ventasTotalSub} ) as total_ventas
  FROM usuario u
  LEFT JOIN ${abonosTable} a ON u.id = a.vendedor_id ${whereClause.replace('WHERE 1=1 AND', 'AND')}
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
    const { abonosTable } = await getDetectedTables();
    if (!abonosTable) {
      return res.status(500).json({ success: false, message: 'Tabla de abonos no encontrada (abonos/abono)' });
    }
    const result = await pool.query(`
      SELECT DISTINCT tipo_pago
      FROM ${abonosTable}
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
