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
    const montoCol = cols.includes('monto') ? 'monto' : (cols.includes('monto_total') ? 'monto_total' : (cols.includes('monto_neto') ? 'monto_neto' : 'monto_abono'));
    const clienteCol = cols.includes('cliente_nombre') ? 'cliente_nombre' : 'cliente';

    // Lógica para evitar doble división: usar monto_neto directo si existe
    let montoExpr = `(a.${montoCol} / 1.19)`;
    if (cols.includes('monto_neto')) {
      montoExpr = `COALESCE(a.monto_neto, a.${montoCol} / 1.19)`;
    }

    let query = `
      SELECT 
        a.id,
        a.folio,
        a.${fechaCol} as fecha_abono,
        (${montoExpr})::numeric(15,0) as monto,
        a.tipo_pago,
        a.${clienteCol} as cliente_nombre,
        a.identificador as descripcion,
        u.nombre_vendedor as vendedor_nombre,
        u.rut as vendedor_id
  FROM ${abonosTable} a
      LEFT JOIN usuario u ON (UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente)) OR UPPER(TRIM(u.alias)) = UPPER(TRIM(a.vendedor_cliente)))
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
      SELECT COUNT(*) as total, SUM(${montoExpr}) as total_monto
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
    const montoCol = cols.includes('monto') ? 'monto' : (cols.includes('monto_neto') ? 'monto_neto' : 'monto_total');

    // Lógica para evitar doble división
    let montoExpr = `${montoCol} / 1.19`;
    if (cols.includes('monto_neto')) {
      montoExpr = `COALESCE(monto_neto, ${montoCol} / 1.19)`;
    }

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
        SUM(${montoExpr}) as monto_total,
        AVG(${montoExpr}) as promedio_abono,
        MIN(${montoExpr}) as abono_minimo,
        MAX(${montoExpr}) as abono_maximo,
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
        SUM(${montoExpr}) as monto_total,
        AVG(${montoExpr})::numeric(15,2) as promedio
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
        SUM(${montoExpr}) as monto_total,
        AVG(${montoExpr})::numeric(15,2) as promedio
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
    console.log('--- DEBUG COMPARATIVO REQUEST ---');
    console.log('Query:', req.query);
    console.log('User:', req.user ? req.user.rut : 'No User');

    const { abonosTable, salesTable } = await getDetectedTables();
    if (!abonosTable) {
      return res.status(500).json({ success: false, message: 'Tabla de abonos no encontrada (abonos/abono)' });
    }
    console.log('[DEBUG Comparativo] Start. User:', req.user.rut, req.user.rol);
    console.log('[DEBUG Comparativo] Tables:', { abonosTable, salesTable });

    // Detectar columnas en tabla abonos
    const { rows: abonoColRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = $1
    `, [abonosTable]);
    const abonoCols = abonoColRows.map(r => r.column_name);
    const abonoFechaCol = abonoCols.includes('fecha_abono') ? 'fecha_abono' : 'fecha';
    const abonoMontoCol = abonoCols.includes('monto') ? 'monto' : (abonoCols.includes('monto_neto') ? 'monto_neto' : 'monto_total');

    // Lógica para evitar doble división
    let abonoMontoExpr = `${abonoMontoCol} / 1.19`;
    if (abonoCols.includes('monto_neto')) {
      abonoMontoExpr = `COALESCE(monto_neto, ${abonoMontoCol} / 1.19)`;
    }

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

    // Detectar col vendedor en Abonos (Moved up)
    let abonoVendorCol = 'vendedor_id';
    let abonoGroupBy = 'vendedor_id';
    const abonoVendorColName = abonoCols.includes('vendedor_cliente') ? 'vendedor_cliente' : (abonoCols.includes('vendedor_id') ? 'vendedor_id' : null);
    if (abonoVendorColName) {
      abonoVendorCol = abonoVendorColName;
      abonoGroupBy = abonoVendorColName;
    }

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    // Params extraction
    // logic for sales filter (uses vendedor_id usually? OR vendedor_cliente?)
    // Sales typically has vendedor_id or vendedor_cliente.
    // NOTE: Sales logic was: s.vendedor_id = u.rut. So Sales probably has `vendedor_id`.
    // Let's assume Sales works for now (salesTable usually has id/rut).

    // Control de acceso - Common Params
    const filterVendedorId = (req.user.rol === 'vendedor') ? req.user.rut : (vendedor_id || null);

    // Determinar col vendedor en Ventas (Moved Up for filtering)
    let salesVendorCol = 'vendedor_id';
    let salesGroupBy = 'vendedor_id';
    if (salesTable) {
      const { rows: scols } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [salesTable]);
      const sColSet = new Set(scols.map(c => c.column_name));
      if (sColSet.has('vendedor_cliente')) {
        salesVendorCol = 'vendedor_cliente';
        salesGroupBy = 'vendedor_cliente';
      }
    }

    // --- SALES WHERE CLAUSE ---
    let whereClauseVentas = 'WHERE 1=1';
    if (filterVendedorId) {
      if (salesVendorCol === 'vendedor_cliente') {
        // Resolve ID -> Name
        const userRes = await pool.query('SELECT nombre_vendedor, alias FROM usuario WHERE rut = $1', [filterVendedorId]);
        console.log('[DEBUG] Looking up user for RUT:', filterVendedorId, 'Found:', userRes.rows.length);
        if (userRes.rows.length > 0) {
          const uName = userRes.rows[0].nombre_vendedor;
          const uAlias = userRes.rows[0].alias;
          console.log('[DEBUG] Resolved Name:', uName, 'Alias:', uAlias);
          whereClauseVentas += ` AND (UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($${paramCounter}))`;
          params.push(uName);
          paramCounter++;
          if (uAlias) {
            whereClauseVentas += ` OR UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($${paramCounter}))`;
            params.push(uAlias);
            paramCounter++;
          }
          whereClauseVentas += `)`;
        } else {
          console.log('[DEBUG] User NOT FOUND for RUT:', filterVendedorId);
          whereClauseVentas += ` AND 1=0`;
        }
      } else {
        whereClauseVentas += ` AND ${salesVendorCol} = $${paramCounter}`;
        params.push(filterVendedorId);
        paramCounter++;
      }
    }
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

    // --- ABONOS WHERE CLAUSE ---
    let whereClauseAbonos = 'WHERE 1=1';
    const abonosParams = [];
    let abonosParamCounter = 1;

    if (filterVendedorId) {
      if (abonoVendorCol === 'vendedor_cliente') {
        // Need to resolve ID -> Name
        const userRes = await pool.query('SELECT nombre_vendedor, alias FROM usuario WHERE rut = $1', [filterVendedorId]);
        if (userRes.rows.length > 0) {
          const uName = userRes.rows[0].nombre_vendedor;
          const uAlias = userRes.rows[0].alias;
          // Filter by Name OR Alias
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
          // User not found? Filter unlikely to match
          whereClauseAbonos += ` AND 1=0`;
        }
      } else {
        // Has ID column
        whereClauseAbonos += ` AND ${abonoVendorCol} = $${abonosParamCounter}`;
        abonosParams.push(filterVendedorId);
        abonosParamCounter++;
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





    // Ejecutar consultas por separado
    const ventasData = salesTable ? await pool.query(`
      SELECT 
        TO_CHAR(${salesDateCol}, '${dateFormat}') as periodo,
        ${salesVendorCol} as vendedor_key,
        SUM(${salesAmountCol}) as total_ventas,
        COUNT(*) as cantidad_ventas
      FROM ${salesTable}
      ${whereClauseVentas}
      GROUP BY TO_CHAR(${salesDateCol}, '${dateFormat}'), ${salesGroupBy}
    `, params) : { rows: [] };

    const abonosData = await pool.query(`
      SELECT 
        TO_CHAR(${abonoFechaCol}, '${dateFormat}') as periodo,
        ${abonoVendorCol} as vendedor_key,
        SUM(${abonoMontoExpr}) as total_abonos,
        COUNT(*) as cantidad_abonos
      FROM ${abonosTable}
      ${whereClauseAbonos}
      GROUP BY TO_CHAR(${abonoFechaCol}, '${dateFormat}'), ${abonoGroupBy}
    `, abonosParams);

    console.log('[DEBUG Comparativo] Abonos Query params:', abonosParams);
    console.log('[DEBUG Comparativo] Abonos SQL (Approx):', `SELECT ... FROM ${abonosTable} ${whereClauseAbonos} ...`);
    console.log('[DEBUG Comparativo] Abonos Data Rows:', abonosData.rows.length);
    if (abonosData.rows.length > 0) console.log('[DEBUG Comparativo] Sample Abono:', abonosData.rows[0]);

    // Combinar resultados en memoria
    const periodoVendedorMap = new Map();

    // Procesar ventas
    ventasData.rows.forEach(row => {
      const keyRaw = row.vendedor_key ? String(row.vendedor_key).trim().toUpperCase() : 'UNKNOWN';
      const key = `${row.periodo}-${keyRaw}`;
      periodoVendedorMap.set(key, {
        periodo: row.periodo,
        vendedor_key: keyRaw, // Used for matching
        original_vendedor: row.vendedor_key,
        total_ventas: parseFloat(row.total_ventas) || 0,
        cantidad_ventas: parseInt(row.cantidad_ventas) || 0,
        total_abonos: 0,
        cantidad_abonos: 0
      });
    });

    // Procesar abonos
    abonosData.rows.forEach(row => {
      const keyRaw = row.vendedor_key ? String(row.vendedor_key).trim().toUpperCase() : 'UNKNOWN';
      const key = `${row.periodo}-${keyRaw}`;
      if (periodoVendedorMap.has(key)) {
        const existing = periodoVendedorMap.get(key);
        existing.total_abonos = parseFloat(row.total_abonos) || 0;
        existing.cantidad_abonos = parseInt(row.cantidad_abonos) || 0;
      } else {
        periodoVendedorMap.set(key, {
          periodo: row.periodo,
          vendedor_key: keyRaw,
          original_vendedor: row.vendedor_key,
          total_ventas: 0,
          cantidad_ventas: 0,
          total_abonos: parseFloat(row.total_abonos) || 0,
          cantidad_abonos: parseInt(row.cantidad_abonos) || 0
        });
      }
    });

    // Obtener nombres de vendedores (y mapear a RUT si es posible)
    // Si la key es el Nombre (vendedor_cliente), buscamos el RUT en usuario
    // Si la key es ya el ID (o RUT), buscamos el Nombre.
    // Dado que estandarizamos a Full Name, la key es likely Full Name.

    const vendorKeys = [...new Set([...periodoVendedorMap.values()].map(v => v.original_vendedor))].filter(Boolean);

    // Fetch user map: Name -> Rut, Rut -> Name
    // Relaxed matching: verify Upper(Nombre) or Rut
    let mapNameToRut = {};
    let mapRutToName = {};

    if (vendorKeys.length > 0) {
      const userQ = await pool.query(`SELECT rut, nombre_vendedor FROM usuario`);
      userQ.rows.forEach(u => {
        if (u.nombre_vendedor) {
          mapNameToRut[u.nombre_vendedor.toUpperCase().trim()] = u.rut;
          mapRutToName[u.rut] = u.nombre_vendedor;
          // Add Alias to map for Hybrid Matching
          if (u.alias) {
            mapNameToRut[u.alias.toUpperCase().trim()] = u.rut;
          }
        }
      });
    }

    // Construir resultado final
    const result = {
      rows: [...periodoVendedorMap.values()].map(row => {
        const normKey = row.vendedor_key; // Upper Trimmed
        // Try to find Name and Rut
        // If key is Name (likely), we find Rut in mapNameToRut
        // If key is Rut (less likely with new logic), we find Name in mapRutToName

        let finalRut = mapNameToRut[normKey] || row.original_vendedor; // Fallback to key if not found
        let finalName = mapRutToName[row.original_vendedor] || row.original_vendedor; // Fallback

        // Check reverse
        if (!mapRutToName[row.original_vendedor] && mapNameToRut[normKey]) {
          // Key was Name
          finalName = row.original_vendedor;
        }

        const tVentas = parseFloat(row.total_ventas) || 0;
        const tAbonos = parseFloat(row.total_abonos) || 0;

        return {
          ...row,
          vendedor_id: String(finalRut),
          vendedor_cliente: finalName,
          vendedor_nombre: finalName,
          total_ventas: tVentas,
          total_abonos: tAbonos,
          diferencia: tVentas - tAbonos,
          porcentaje_cobrado: tVentas > 0
            ? parseFloat(((tAbonos / tVentas) * 100).toFixed(2))
            : 0
        };
      }).sort((a, b) => {
        if (b.periodo !== a.periodo) return b.periodo.localeCompare(a.periodo);
        return String(a.vendedor_nombre).localeCompare(String(b.vendedor_nombre));
      })
    };

    // Resumen total - también con consultas separadas
    const ventasTotalData = salesTable ? await pool.query(`
      SELECT 
        SUM(${salesAmountCol}) as total_ventas,
        COUNT(*) as cantidad_ventas
      FROM ${salesTable}
      ${whereClauseVentas}
    `, params) : { rows: [{ total_ventas: 0, cantidad_ventas: 0 }] };

    const abonosTotalData = await pool.query(`
      SELECT 
        SUM(${abonoMontoExpr}) as total_abonos,
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

    // Detectar columnas en tabla abonos
    const { rows: abonoColRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = $1
    `, [abonosTable]);
    const abonoCols = abonoColRows.map(r => r.column_name);
    const abonoFechaCol = abonoCols.includes('fecha_abono') ? 'fecha_abono' : 'fecha';
    const abonoMontoCol = abonoCols.includes('monto') ? 'monto' : (abonoCols.includes('monto_neto') ? 'monto_neto' : 'monto_total');

    // Lógica para evitar doble división
    let abonoMontoExpr = `a.${abonoMontoCol} / 1.19`;
    if (abonoCols.includes('monto_neto')) {
      abonoMontoExpr = `COALESCE(a.monto_neto, a.${abonoMontoCol} / 1.19)`;
    }

    // Detectar columnas en tabla ventas
    let salesDateCol = 'fecha_emision';
    let salesAmountCol = 'valor_total';
    if (salesTable) {
      const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [salesTable]);
      const cols = rows.map(r => r.column_name);
      if (cols.includes('fecha_emision')) salesDateCol = 'fecha_emision';
      else if (cols.includes('invoice_date')) salesDateCol = 'invoice_date';
      else if (cols.includes('fecha')) salesDateCol = 'fecha';
      if (cols.includes('valor_total')) salesAmountCol = 'valor_total';
      else if (cols.includes('total_venta')) salesAmountCol = 'total_venta';
      else if (cols.includes('monto_total')) salesAmountCol = 'monto_total';
      else if (cols.includes('net_amount')) salesAmountCol = 'net_amount';
    }

    // Solo managers pueden ver todos los vendedores
    if (!req.user.rol || req.user.rol.toLowerCase() !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta información'
      });
    }

    const params = [];
    let paramCounter = 1;
    let joinConditions = '';

    if (fecha_desde) {
      joinConditions += ` AND a.${abonoFechaCol} >= $${paramCounter}`;
      params.push(fecha_desde);
      paramCounter++;
    }

    if (fecha_hasta) {
      joinConditions += ` AND a.${abonoFechaCol} <= $${paramCounter}`;
      params.push(fecha_hasta);
      paramCounter++;
    }

    // Subqueries need independent parameter indexing or reuse?
    // Using string interpolation with values directly in subquery is safer for independent params, 
    // BUT we are using $1, $2 which refer to the main query params.
    // Since we push fecha_desde/hasta to params, $1 and $2 are valid.

    // WARNING: logic below re-uses $1 and $2 in subquery text.
    // If fecha_desde is present (param $1), subquery uses $1. Correct.
    // If fecha_desde is NOT present but fecha_hasta IS?
    // Then params has [fecha_hasta]. paramCounter was 1. joinConditions uses $1.
    // subquery logic:
    // ${fecha_desde ? `AND s.${salesDateCol} >= $1` : ''} 
    // ${fecha_hasta ? `AND s.${salesDateCol} <= $${fecha_desde ? 2 : 1}` : ''}
    // This logic correctly calculates index! ($2 if from exists, else $1).
    // So distinct params array matches strictly.

    // 4. Construir subqueries para Ventas (Corregido para usar MATCH POR NOMBRE si no hay ID)
    //    Si tabla ventas tiene columna vendedor_cliente, usaremos eso para comparar con u.nombre_vendedor
    let ventasMatchCondition = 's.vendedor_id = u.rut'; // Default (fallback to RUT)

    // Detectar columna de vendedor en ventas
    let salesVendorCol = null;
    if (salesTable) {
      const { rows: scols } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [salesTable]);
      const sColSet = new Set(scols.map(c => c.column_name));
      if (sColSet.has('vendedor_cliente')) salesVendorCol = 'vendedor_cliente';
      else if (sColSet.has('vendedor_id')) salesVendorCol = 'vendedor_id';
    }

    // Definir condicion de join para ventas
    if (salesVendorCol === 'vendedor_cliente') {
      // Hybrid Match: Full Name OR Alias
      ventasMatchCondition = '(UPPER(TRIM(s.vendedor_cliente)) = UPPER(TRIM(u.nombre_vendedor)) OR UPPER(TRIM(s.vendedor_cliente)) = UPPER(TRIM(u.alias)))';
    } else if (salesVendorCol === 'vendedor_id') {
      // Fallback: usuario no tiene id, tiene rut. Asumimos que si hay vendedor_id en ventas, es el RUT
      ventasMatchCondition = 's.vendedor_id = u.rut';
    }

    const ventasCantidadSub = salesTable
      ? `SELECT COUNT(*) FROM ${salesTable} s WHERE ${ventasMatchCondition} ${fecha_desde ? `AND s.${salesDateCol} >= $1` : ''} ${fecha_hasta ? `AND s.${salesDateCol} <= $${fecha_desde ? 2 : 1}` : ''}`
      : `SELECT 0`;

    const ventasTotalSub = salesTable
      ? `SELECT COALESCE(SUM(${salesAmountCol}), 0) FROM ${salesTable} s WHERE ${ventasMatchCondition} ${fecha_desde ? `AND s.${salesDateCol} >= $1` : ''} ${fecha_hasta ? `AND s.${salesDateCol} <= $${fecha_desde ? 2 : 1}` : ''}`
      : `SELECT 0`;

    // 5. Construir Join Condition para Abonos (Corregido para MATCH POR NOMBRE)
    //    usuario no tiene id, tiene rut. Abono no tiene vendedor_id, tiene vendedor_cliente.
    const abonoVendorCol = abonoCols.includes('vendedor_cliente') ? 'vendedor_cliente' : (abonoCols.includes('vendedor_id') ? 'vendedor_id' : null);

    let abonoJoinCondition = 'FALSE'; // Safe default
    if (abonoVendorCol === 'vendedor_cliente') {
      // Hybrid Match: Full Name OR Alias
      abonoJoinCondition = '(UPPER(TRIM(u.nombre_vendedor)) = UPPER(TRIM(a.vendedor_cliente)) OR UPPER(TRIM(u.alias)) = UPPER(TRIM(a.vendedor_cliente)))';
    } else if (abonoVendorCol === 'vendedor_id') {
      abonoJoinCondition = 'u.rut = a.vendedor_id';
    }

    const query = `
      SELECT 
        u.rut as vendedor_id,         -- Return RUT as ID for frontend compatibility
        u.nombre_vendedor as vendedor_nombre,
        COUNT(a.id) as cantidad_abonos,
        COALESCE(SUM(${abonoMontoExpr}), 0) as total_abonos,
        COALESCE(AVG(${abonoMontoExpr}), 0)::numeric(15,2) as promedio_abono,
        MIN(a.${abonoFechaCol}) as primer_abono,
        MAX(a.${abonoFechaCol}) as ultimo_abono,
        -- Ventas del vendedor
        ( ${ventasCantidadSub} ) as cantidad_ventas,
        ( ${ventasTotalSub} ) as total_ventas
      FROM usuario u
      LEFT JOIN ${abonosTable} a ON ${abonoJoinCondition} ${joinConditions}
      WHERE u.rol_usuario IN ('vendedor', 'manager', 'VENDEDOR', 'MANAGER')
      GROUP BY u.rut, u.nombre_vendedor
      ORDER BY total_abonos DESC NULLS LAST
    `;

    const result = await pool.query(query, params);

    // Calcular porcentajes y agregar métricas
    const vendedoresConMetricas = result.rows.map(v => ({
      ...v,
      // Ensure numeric types for safety
      total_ventas: parseFloat(v.total_ventas || 0),
      total_abonos: parseFloat(v.total_abonos || 0),
      porcentaje_cobrado: parseFloat(v.total_ventas) > 0
        ? ((parseFloat(v.total_abonos) / parseFloat(v.total_ventas)) * 100).toFixed(2)
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

// Endpoint de diagnóstico rápido
router.get('/diagnostico', auth(), async (req, res) => {
  try {
    const { abonosTable, salesTable } = await getDetectedTables();

    // Check tables columns
    const abonoCols = (await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [abonosTable])).rows.map(c => c.column_name);
    const abonoMontoCol = abonoCols.includes('monto') ? 'monto' : (abonoCols.includes('monto_neto') ? 'monto_neto' : 'monto_total');

    // Check User
    const user = req.user;

    // Simple Count
    const countRes = await pool.query(`SELECT COUNT(*) as cnt, SUM(${abonoMontoCol}) as sum FROM ${abonosTable}`);

    // Check specific user if Rut present
    let specificRes = null;
    if (user.rut) {
      // Resolve Name
      const uRes = await pool.query('SELECT nombre_vendedor, alias FROM usuario WHERE rut = $1', [user.rut]);
      if (uRes.rows.length > 0) {
        const name = uRes.rows[0].nombre_vendedor;
        specificRes = await pool.query(`SELECT COUNT(*) as cnt, SUM(${abonoMontoCol}) as sum FROM ${abonosTable} WHERE UPPER(TRIM(vendedor_cliente)) = UPPER(TRIM($1))`, [name]);
      }
    }

    res.json({
      success: true,
      env: process.env.NODE_ENV,
      user,
      tables: { abonosTable, salesTable, abonoMontoCol },
      globalStats: countRes.rows[0],
      userSpecificStats: specificRes ? specificRes.rows[0] : 'No specific user stats',
      dbConnection: 'OK'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

module.exports = router;
