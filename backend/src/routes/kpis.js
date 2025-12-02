const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Runtime detection: resolve sales table name and key column names (amount/date/client)
let detectedSales = null;
let detectedAt = 0;
async function getDetectedSales() {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins
  if (detectedSales && (Date.now() - detectedAt) < CACHE_TTL_MS) return detectedSales;

  // Detect table name
  const tablesQ = `
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') AS has_sales,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas') AS has_ventas,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'venta') AS has_venta
  `;
  const { rows: trows } = await pool.query(tablesQ);
  const t = trows[0] || {};
  const salesTable = t.has_sales ? 'sales' : (t.has_ventas ? 'ventas' : (t.has_venta ? 'venta' : null));

  let amountCol = null;
  let dateCol = null;
  let clientIdCol = null;

  if (salesTable) {
    const colsQ = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
    `;
    const { rows: crows } = await pool.query(colsQ, [salesTable]);
    const cols = new Set(crows.map(r => r.column_name));
    // Amount
    if (cols.has('valor_total')) amountCol = 'valor_total';
    else if (cols.has('net_amount')) amountCol = 'net_amount';
    else if (cols.has('total_venta')) amountCol = 'total_venta';
    else if (cols.has('monto_total')) amountCol = 'monto_total';
    // Date
    if (cols.has('fecha_emision')) dateCol = 'fecha_emision';
    else if (cols.has('fecha_factura')) dateCol = 'fecha_factura';
    else if (cols.has('invoice_date')) dateCol = 'invoice_date';
    else if (cols.has('fecha')) dateCol = 'fecha';
    // Client FK
    if (cols.has('client_id')) clientIdCol = 'client_id';
    else if (cols.has('cliente_id')) clientIdCol = 'cliente_id';
    else if (cols.has('rut_cliente')) clientIdCol = 'rut_cliente';
    else if (cols.has('cliente_rut')) clientIdCol = 'cliente_rut';
    else if (cols.has('rut')) clientIdCol = 'rut';
  }

  detectedSales = { salesTable, amountCol, dateCol, clientIdCol };
  detectedAt = Date.now();
  console.log('[getDetectedSales] Detección:', detectedSales);
  return detectedSales;
}

// @route   GET /api/kpis/top-clients
// @desc    Get top 5 clients by sales
// @access  Private
router.get('/top-clients', auth(), async (req, res) => {
  try {
    const { salesTable, amountCol, clientIdCol } = await getDetectedSales();
    if (!salesTable || !amountCol || !clientIdCol) {
      return res.json([]); // graceful empty for environments without sales schema
    }

    if (req.user.rol === 'MANAGER') {
      const query = `
        SELECT c.nombre, SUM(s.${amountCol}) AS total_sales
        FROM ${salesTable} s
        JOIN cliente c ON s.${clientIdCol} = c.id
        GROUP BY c.nombre
        ORDER BY total_sales DESC
        LIMIT 5
      `;
      const result = await pool.query(query);
      return res.json(result.rows);
    } else {
      const query = `
        SELECT c.nombre, SUM(s.${amountCol}) AS total_sales
        FROM ${salesTable} s
        JOIN cliente c ON s.${clientIdCol} = c.id
        WHERE c.vendedor_id = $1
        GROUP BY c.nombre
        ORDER BY total_sales DESC
        LIMIT 5
      `;
      const result = await pool.query(query, [req.user.rut]);
      return res.json(result.rows);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/kpis/sales-summary
// @desc    Get total sales for the last 3 months
// @access  Private
router.get('/sales-summary', auth(), async (req, res) => {
  try {
    const { salesTable, amountCol, dateCol, clientIdCol } = await getDetectedSales();
    if (!salesTable || !amountCol || !dateCol) {
      return res.json({ total_sales: 0 });
    }

    if (req.user.rol === 'MANAGER') {
      const query = `
        SELECT SUM(${amountCol}) AS total_sales
        FROM ${salesTable}
        WHERE ${dateCol} >= NOW() - INTERVAL '3 months'
      `;
      const result = await pool.query(query);
      return res.json(result.rows[0] || { total_sales: 0 });
    } else {
      if (!clientIdCol) return res.json({ total_sales: 0 });
      const query = `
        SELECT SUM(s.${amountCol}) AS total_sales
        FROM ${salesTable} s
        JOIN cliente c ON s.${clientIdCol} = c.id
        WHERE c.vendedor_id = $1
        AND s.${dateCol} >= NOW() - INTERVAL '3 months'
      `;
      const result = await pool.query(query, [req.user.rut]);
      return res.json(result.rows[0] || { total_sales: 0 });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/kpis/mes-actual
// @desc    Get KPIs for current month: sales, payments, YoY%, client count
//          Supports optional ?mes=YYYY-MM parameter. If not provided, uses latest month with data.
// @access  Private
router.get('/mes-actual', auth(), async (req, res) => {
  try {
    const { salesTable, amountCol, dateCol, clientIdCol } = await getDetectedSales();
    if (!salesTable || !amountCol || !dateCol || !clientIdCol) {
      return res.json({
        success: true,
        data: {
          monto_ventas_mes: 0,
          monto_abonos_mes: 0,
          variacion_vs_anio_anterior_pct: 0,
          numero_clientes_con_venta_mes: 0
        }
      });
    }

    const user = req.user;
    const isManager = user.rol === 'MANAGER';

    // Determinar mes a consultar: parámetro ?mes=YYYY-MM o último mes con datos
    let mesActual;
    if (req.query.mes && /^\d{4}-\d{2}$/.test(req.query.mes)) {
      mesActual = req.query.mes;
    } else {
      // Detectar último mes con datos en la tabla de ventas
      const ultimoMesQuery = `
        SELECT TO_CHAR(MAX(${dateCol}), 'YYYY-MM') AS ultimo_mes
        FROM ${salesTable}
      `;
      const ultimoMesResult = await pool.query(ultimoMesQuery);
      mesActual = ultimoMesResult.rows[0]?.ultimo_mes || new Date().toISOString().slice(0, 7);
    }

    const [year, month] = mesActual.split('-').map(Number);
    const mesAnioAnterior = new Date(year - 1, month - 1, 1).toISOString().slice(0, 7);

    // Detectar vendedor column
    let vendedorCol = 'vendedor_id';
    const vendedorColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('vendedor_id', 'vendedor_cliente')
      LIMIT 1
    `, [salesTable]);
    if (vendedorColCheck.rows.length > 0) {
      vendedorCol = vendedorColCheck.rows[0].column_name;
    }

    // Filtro vendedor: Managers pueden filtrar por vendedor_id, vendedores solo ven sus datos
    let vendedorFilter = '';
    let params = [];
    
    // Si es manager y se proporciona vendedor_id en query, filtrar por ese vendedor
    if (isManager && req.query.vendedor_id) {
      const vendedorRut = req.query.vendedor_id; // Ahora es RUT, no ID numérico
      
      // Buscar el nombre del vendedor por su RUT
      const vendedorQuery = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [vendedorRut]);
      if (vendedorQuery.rows.length > 0) {
        const nombreVendedor = vendedorQuery.rows[0].nombre_vendedor;
        if (vendedorCol === 'vendedor_cliente') {
          vendedorFilter = `AND UPPER(${vendedorCol}) = UPPER($1)`;
          params = [nombreVendedor];
        } else {
          vendedorFilter = `AND ${vendedorCol} = $1`;
          params = [nombreVendedor];
        }
      }
    }
    // Si NO es manager, filtrar por sus propios datos
    else if (!isManager) {
      if (vendedorCol === 'vendedor_cliente') {
        // Usar nombre_vendedor del token JWT
        if (user.nombre_vendedor) {
          vendedorFilter = `AND UPPER(${vendedorCol}) = UPPER($1)`;
          params = [user.nombre_vendedor];
        }
      } else {
        vendedorFilter = `AND ${vendedorCol} = $1`;
        params = [user.nombre_vendedor || user.rut];
      }
    }

    // 1. Monto ventas mes actual
    const queryVentasMes = `
      SELECT COALESCE(SUM(${amountCol}), 0) AS monto
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') = $${params.length + 1}
      ${vendedorFilter}
    `;
    const ventasMesResult = await pool.query(queryVentasMes, [...params, mesActual]);
    const montoVentasMes = parseFloat(ventasMesResult.rows[0]?.monto || 0);

    // 2. Monto ventas mismo mes año anterior
    const queryVentasAnioAnt = `
      SELECT COALESCE(SUM(${amountCol}), 0) AS monto
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') = $${params.length + 1}
      ${vendedorFilter}
    `;
    const ventasAnioAntResult = await pool.query(queryVentasAnioAnt, [...params, mesAnioAnterior]);
    const montoVentasAnioAnt = parseFloat(ventasAnioAntResult.rows[0]?.monto || 0);

    // Calcular variación porcentual
    let variacionPct = 0;
    if (montoVentasAnioAnt > 0) {
      variacionPct = ((montoVentasMes - montoVentasAnioAnt) / montoVentasAnioAnt) * 100;
    } else if (montoVentasMes > 0) {
      variacionPct = 100; // 100% si había 0 antes y ahora hay algo
    }

    // 3. Monto abonos mes actual (tabla abono)
    let montoAbonosMes = 0;
    const abonoTableCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abono') AS has_abono
    `);
    if (abonoTableCheck.rows[0]?.has_abono) {
      // Detectar columnas en tabla abono
      const abonoColsQ = await pool.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'abono'
      `);
      const abonoCols = new Set(abonoColsQ.rows.map(r => r.column_name));
      
      let abonoAmountCol = null;
      let abonoDateCol = null;
      let abonoVendedorCol = null;

      if (abonoCols.has('monto')) abonoAmountCol = 'monto';
      else if (abonoCols.has('monto_abono')) abonoAmountCol = 'monto_abono';
      
      if (abonoCols.has('fecha_abono')) abonoDateCol = 'fecha_abono';
      else if (abonoCols.has('fecha')) abonoDateCol = 'fecha';
      
      if (abonoCols.has('vendedor_id')) abonoVendedorCol = 'vendedor_id';
      else if (abonoCols.has('vendedor_cliente')) abonoVendedorCol = 'vendedor_cliente';

      if (abonoAmountCol && abonoDateCol) {
        let abonoVendedorFilter = '';
        let abonoParams = [];
        
        // Aplicar el mismo filtro de vendedor que en ventas
        // Si es manager con filtro vendedor_id, usar el nombre del vendedor ya obtenido
        if (params.length > 0 && abonoVendedorCol) {
          const nombreVendedor = params[0]; // Ya tenemos el nombre del vendedor de la query anterior
          if (abonoVendedorCol === 'vendedor_cliente') {
            abonoVendedorFilter = `AND UPPER(${abonoVendedorCol}) = UPPER($1)`;
            abonoParams = [nombreVendedor];
          } else {
            abonoVendedorFilter = `AND ${abonoVendedorCol} = $1`;
            abonoParams = [nombreVendedor];
          }
        }
        // Si NO es manager, filtrar por sus propios datos
        else if (!isManager && abonoVendedorCol) {
          if (abonoVendedorCol === 'vendedor_cliente') {
            if (user.nombre_vendedor) {
              abonoVendedorFilter = `AND UPPER(${abonoVendedorCol}) = UPPER($1)`;
              abonoParams = [user.nombre_vendedor];
            }
          } else {
            abonoVendedorFilter = `AND ${abonoVendedorCol} = $1`;
            abonoParams = [user.nombre_vendedor || user.rut];
          }
        }

        const queryAbonosMes = `
          SELECT COALESCE(SUM(${abonoAmountCol}), 0) AS monto
          FROM abono
          WHERE TO_CHAR(${abonoDateCol}, 'YYYY-MM') = $${abonoParams.length + 1}
          ${abonoVendedorFilter}
        `;
        const abonosResult = await pool.query(queryAbonosMes, [...abonoParams, mesActual]);
        montoAbonosMes = parseFloat(abonosResult.rows[0]?.monto || 0);
      }
    }

    // 4. Número de clientes con venta en el mes actual
    const queryClientesConVenta = `
      SELECT COUNT(DISTINCT ${clientIdCol}) AS num_clientes
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') = $${params.length + 1}
      ${vendedorFilter}
    `;
    const clientesResult = await pool.query(queryClientesConVenta, [...params, mesActual]);
    const numClientesConVenta = parseInt(clientesResult.rows[0]?.num_clientes || 0);

    // 5. Promedio ventas del trimestre anterior al mes actual
    // Calcular los 3 meses anteriores al mes actual
    const fecha1MesAntes = new Date(year, month - 2, 1).toISOString().slice(0, 7);
    const fecha2MesesAntes = new Date(year, month - 3, 1).toISOString().slice(0, 7);
    const fecha3MesesAntes = new Date(year, month - 4, 1).toISOString().slice(0, 7);

    const queryVentasTrimestreAnterior = `
      SELECT COALESCE(SUM(${amountCol}), 0) AS monto_total
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') IN ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})
      ${vendedorFilter}
    `;
    const ventasTrimestreResult = await pool.query(queryVentasTrimestreAnterior, [...params, fecha3MesesAntes, fecha2MesesAntes, fecha1MesAntes]);
    const montoVentasTrimestre = parseFloat(ventasTrimestreResult.rows[0]?.monto_total || 0);
    const promedioVentasTrimestre = montoVentasTrimestre / 3;

    console.log('[KPIs] Respuesta final:', {
      mes: mesActual,
      ventas: montoVentasMes,
      abonos: montoAbonosMes,
      promedio_trimestre: promedioVentasTrimestre,
      isManager,
      vendedorFilter: vendedorFilter || 'SIN FILTRO'
    });

    // Headers para evitar caché
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json({
      success: true,
      data: {
        monto_ventas_mes: montoVentasMes,
        monto_ventas_anio_anterior: montoVentasAnioAnt,
        monto_abonos_mes: montoAbonosMes,
        variacion_vs_anio_anterior_pct: variacionPct,
        promedio_ventas_trimestre_anterior: promedioVentasTrimestre,
        numero_clientes_con_venta_mes: numClientesConVenta,
        mes_consultado: mesActual
      }
    });
  } catch (err) {
    console.error('Error en /api/kpis/mes-actual:', err.message);
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/kpis/dashboard-current
// @desc    Get current dashboard KPIs (NUEVO - bypass Cloudflare cache)
// @access  Private
router.get('/dashboard-current', auth(), async (req, res) => {
  try {
    const { salesTable, amountCol, dateCol, clientIdCol } = await getDetectedSales();
    if (!salesTable || !amountCol || !dateCol) {
      return res.json({
        success: true,
        data: {
          monto_ventas_mes: 0,
          monto_abonos_mes: 0,
          variacion_vs_anio_anterior_pct: 0,
          numero_clientes_con_venta_mes: 0,
          promedio_ventas_trimestre_anterior: 0,
          monto_ventas_anio_anterior: 0,
          mes_consultado: new Date().toISOString().slice(0, 7)
        }
      });
    }

    const user = req.user;
    const isManager = user.rol === 'MANAGER';

    // Determinar mes a consultar
    let mesActual;
    if (req.query.mes && /^\d{4}-\d{2}$/.test(req.query.mes)) {
      mesActual = req.query.mes;
    } else {
      const ultimoMesQuery = `SELECT TO_CHAR(MAX(${dateCol}), 'YYYY-MM') AS ultimo_mes FROM ${salesTable}`;
      const ultimoMesResult = await pool.query(ultimoMesQuery);
      mesActual = ultimoMesResult.rows[0]?.ultimo_mes || new Date().toISOString().slice(0, 7);
    }

    const [year, month] = mesActual.split('-').map(Number);
    const mesAnioAnterior = new Date(year - 1, month - 1, 1).toISOString().slice(0, 7);

    // Detectar columna vendedor
    let vendedorCol = 'vendedor_id';
    const vendedorColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('vendedor_id', 'vendedor_cliente')
      LIMIT 1
    `, [salesTable]);
    if (vendedorColCheck.rows.length > 0) {
      vendedorCol = vendedorColCheck.rows[0].column_name;
    }

    // Filtro vendedor
    let vendedorFilter = '';
    let params = [];
    
    if (isManager && req.query.vendedor_id) {
      const vendedorRut = req.query.vendedor_id; // Ahora es RUT, no ID numérico
      
      // Buscar el nombre del vendedor por RUT
      const vendedorQuery = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [vendedorRut]);
      if (vendedorQuery.rows.length > 0) {
        const nombreVendedor = vendedorQuery.rows[0].nombre_vendedor;
        if (vendedorCol === 'vendedor_cliente') {
          vendedorFilter = `AND UPPER(${vendedorCol}) = UPPER($1)`;
          params = [nombreVendedor];
        } else {
          vendedorFilter = `AND ${vendedorCol} = $1`;
          params = [nombreVendedor];
        }
      }
    } else if (!isManager) {
      if (vendedorCol === 'vendedor_cliente') {
        if (user.nombre_vendedor) {
          vendedorFilter = `AND UPPER(${vendedorCol}) = UPPER($1)`;
          params = [user.nombre_vendedor];
        }
      } else {
        vendedorFilter = `AND ${vendedorCol} = $1`;
        params = [user.nombre_vendedor || user.rut];
      }
    }

    // Ventas mes actual
    const queryVentasMes = `
      SELECT COALESCE(SUM(${amountCol}), 0) AS monto
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') = $${params.length + 1}
      ${vendedorFilter}
    `;
    const ventasMesResult = await pool.query(queryVentasMes, [...params, mesActual]);
    const montoVentasMes = parseFloat(ventasMesResult.rows[0]?.monto || 0);

    // Ventas año anterior
    const queryVentasAnioAnt = `
      SELECT COALESCE(SUM(${amountCol}), 0) AS monto
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') = $${params.length + 1}
      ${vendedorFilter}
    `;
    const ventasAnioAntResult = await pool.query(queryVentasAnioAnt, [...params, mesAnioAnterior]);
    const montoVentasAnioAnt = parseFloat(ventasAnioAntResult.rows[0]?.monto || 0);

    // Variación porcentual
    let variacionPct = 0;
    if (montoVentasAnioAnt > 0) {
      variacionPct = ((montoVentasMes - montoVentasAnioAnt) / montoVentasAnioAnt) * 100;
    } else if (montoVentasMes > 0) {
      variacionPct = 100;
    }

    // Abonos mes actual
    let montoAbonosMes = 0;
    const abonoTableCheck = await pool.query(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abono') AS has_abono`);
    if (abonoTableCheck.rows[0]?.has_abono) {
      const abonoColsQ = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'abono'`);
      const abonoCols = new Set(abonoColsQ.rows.map(r => r.column_name));
      
      let abonoAmountCol = abonoCols.has('monto') ? 'monto' : (abonoCols.has('monto_abono') ? 'monto_abono' : null);
      let abonoDateCol = abonoCols.has('fecha_abono') ? 'fecha_abono' : (abonoCols.has('fecha') ? 'fecha' : null);
      let abonoVendedorCol = abonoCols.has('vendedor_id') ? 'vendedor_id' : (abonoCols.has('vendedor_cliente') ? 'vendedor_cliente' : null);

      if (abonoAmountCol && abonoDateCol) {
        let abonoVendedorFilter = '';
        let abonoParams = [];
        
        if (params.length > 0 && abonoVendedorCol) {
          const nombreVendedor = params[0];
          if (abonoVendedorCol === 'vendedor_cliente') {
            abonoVendedorFilter = `AND UPPER(${abonoVendedorCol}) = UPPER($1)`;
            abonoParams = [nombreVendedor];
          } else {
            abonoVendedorFilter = `AND ${abonoVendedorCol} = $1`;
            abonoParams = [nombreVendedor];
          }
        } else if (!isManager && abonoVendedorCol) {
          if (abonoVendedorCol === 'vendedor_cliente' && user.nombre_vendedor) {
            abonoVendedorFilter = `AND UPPER(${abonoVendedorCol}) = UPPER($1)`;
            abonoParams = [user.nombre_vendedor];
          } else {
            abonoVendedorFilter = `AND ${abonoVendedorCol} = $1`;
            abonoParams = [user.nombre_vendedor || user.rut];
          }
        }

        const queryAbonosMes = `
          SELECT COALESCE(SUM(${abonoAmountCol}), 0) AS monto
          FROM abono
          WHERE TO_CHAR(${abonoDateCol}, 'YYYY-MM') = $${abonoParams.length + 1}
          ${abonoVendedorFilter}
        `;
        const abonosResult = await pool.query(queryAbonosMes, [...abonoParams, mesActual]);
        montoAbonosMes = parseFloat(abonosResult.rows[0]?.monto || 0);
      }
    }

    // Clientes con venta (solo si tenemos columna de cliente)
    let numClientesConVenta = 0;
    if (clientIdCol) {
      const queryClientesConVenta = `
        SELECT COUNT(DISTINCT ${clientIdCol}) AS num_clientes
        FROM ${salesTable}
        WHERE TO_CHAR(${dateCol}, 'YYYY-MM') = $${params.length + 1}
        ${vendedorFilter}
      `;
      const clientesResult = await pool.query(queryClientesConVenta, [...params, mesActual]);
      numClientesConVenta = parseInt(clientesResult.rows[0]?.num_clientes || 0);
    }

    // Promedio trimestre anterior
    const fecha1MesAntes = new Date(year, month - 2, 1).toISOString().slice(0, 7);
    const fecha2MesesAntes = new Date(year, month - 3, 1).toISOString().slice(0, 7);
    const fecha3MesesAntes = new Date(year, month - 4, 1).toISOString().slice(0, 7);

    const queryVentasTrimestreAnterior = `
      SELECT COALESCE(SUM(${amountCol}), 0) AS monto_total
      FROM ${salesTable}
      WHERE TO_CHAR(${dateCol}, 'YYYY-MM') IN ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})
      ${vendedorFilter}
    `;
    const ventasTrimestreResult = await pool.query(queryVentasTrimestreAnterior, [...params, fecha3MesesAntes, fecha2MesesAntes, fecha1MesAntes]);
    const montoVentasTrimestre = parseFloat(ventasTrimestreResult.rows[0]?.monto_total || 0);
    const promedioVentasTrimestre = montoVentasTrimestre / 3;

    console.log('[KPIs dashboard-current] Respuesta:', {
      mes: mesActual,
      ventas: montoVentasMes,
      abonos: montoAbonosMes,
      promedio_trimestre: promedioVentasTrimestre,
      isManager,
      vendedorFilter: vendedorFilter || 'SIN FILTRO'
    });

    // Headers anti-caché
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    res.json({
      success: true,
      data: {
        monto_ventas_mes: montoVentasMes,
        monto_ventas_anio_anterior: montoVentasAnioAnt,
        monto_abonos_mes: montoAbonosMes,
        variacion_vs_anio_anterior_pct: variacionPct,
        promedio_ventas_trimestre_anterior: promedioVentasTrimestre,
        numero_clientes_con_venta_mes: numClientesConVenta,
        mes_consultado: mesActual
      }
    });
  } catch (err) {
    console.error('Error en /api/kpis/dashboard-current:', err.message);
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/kpis/saldo-credito-total
// @desc    Get total outstanding credit (saldo_factura) from saldo_credito table
//          Managers see global total by default, can filter by vendedor (?vendedor_id=RUT)
//          Vendors see only their own total (by nombre_vendedor)
// @access  Private
router.get('/saldo-credito-total', auth(), async (req, res) => {
  try {
    // Check if saldo_credito table exists
    const existsQ = `
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'saldo_credito'
      ) AS exists
    `;
    const existsRes = await pool.query(existsQ);
    const tableExists = existsRes.rows[0]?.exists;
    if (!tableExists) {
      return res.json({ success: true, data: { total_saldo_credito: 0 } });
    }

    const user = req.user || {};
    const isManager = (user.rol || '').toUpperCase() === 'MANAGER';

    // Base query
    let sql = 'SELECT COALESCE(SUM(saldo_factura), 0) AS total FROM saldo_credito';
    const params = [];
    let where = '';

    if (isManager) {
      // Allow optional filter by vendedor_id (RUT) -> map to nombre_vendedor
      if (req.query.vendedor_id) {
        const rut = String(req.query.vendedor_id);
        const vRes = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [rut]);
        if (vRes.rows.length > 0) {
          where = ' WHERE UPPER(TRIM(nombre_vendedor)) = UPPER(TRIM($1))';
          params.push(vRes.rows[0].nombre_vendedor);
        }
      }
    } else {
      // Vendors: filter by their nombre_vendedor when available, fallback to rut if needed
      if (user.nombre_vendedor) {
        where = ' WHERE UPPER(TRIM(nombre_vendedor)) = UPPER(TRIM($1))';
        params.push(user.nombre_vendedor);
      } else if (user.rut) {
        // Try to resolve nombre_vendedor from rut
        const vRes = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [user.rut]);
        const nombreVend = vRes.rows[0]?.nombre_vendedor || user.rut;
        where = ' WHERE UPPER(TRIM(nombre_vendedor)) = UPPER(TRIM($1))';
        params.push(nombreVend);
      }
    }

    const { rows } = await pool.query(sql + where, params);
    const total = parseFloat(rows[0]?.total || 0);

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.json({ success: true, data: { total_saldo_credito: total } });
  } catch (err) {
    console.error('Error en /api/kpis/saldo-credito-total:', err.message);
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/kpis/evolucion-mensual
// @desc    Get monthly evolution of sales and payments for last N months
//          Supports optional params: ?meses=12 (default), ?fechaInicio=YYYY-MM, ?fechaFin=YYYY-MM
// @access  Private
router.get('/evolucion-mensual', auth(), async (req, res) => {
  try {
    const { salesTable, amountCol, dateCol } = await getDetectedSales();
    if (!salesTable || !amountCol || !dateCol) {
      return res.json([]);
    }

    const user = req.user;
    const isManager = user.rol === 'MANAGER';

    // Parámetros opcionales
    const mesesAtras = parseInt(req.query.meses) || 12;
    const fechaInicio = req.query.fechaInicio; // YYYY-MM
    const fechaFin = req.query.fechaFin;       // YYYY-MM

    // Construir filtro de fechas
    let fechaFilter = '';
    let fechaParams = [];
    
    if (fechaInicio && fechaFin) {
      // Rango específico
      fechaFilter = `WHERE ${dateCol} >= $1::date AND ${dateCol} < ($2::text || '-01')::date + INTERVAL '1 month'`;
      fechaParams = [`${fechaInicio}-01`, fechaFin];
    } else if (fechaInicio) {
      // Desde una fecha
      fechaFilter = `WHERE ${dateCol} >= $1::date`;
      fechaParams = [`${fechaInicio}-01`];
    } else {
      // Últimos N meses desde el último dato disponible
      const ultimoMesQuery = `SELECT TO_CHAR(MAX(${dateCol}), 'YYYY-MM') AS ultimo_mes FROM ${salesTable}`;
      const ultimoMesResult = await pool.query(ultimoMesQuery);
      const ultimoMes = ultimoMesResult.rows[0]?.ultimo_mes;
      
      if (ultimoMes) {
        const [year, month] = ultimoMes.split('-').map(Number);
        const fechaLimite = new Date(year, month - mesesAtras, 1).toISOString().slice(0, 7);
        fechaFilter = `WHERE ${dateCol} >= $1::date`;
        fechaParams = [`${fechaLimite}-01`];
      } else {
        fechaFilter = `WHERE ${dateCol} >= CURRENT_DATE - INTERVAL '${mesesAtras} months'`;
      }
    }

    // Detectar vendedor column
    let vendedorCol = 'vendedor_id';
    const vendedorColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('vendedor_id', 'vendedor_cliente')
      LIMIT 1
    `, [salesTable]);
    if (vendedorColCheck.rows.length > 0) {
      vendedorCol = vendedorColCheck.rows[0].column_name;
    }

    // Filtro vendedor
    let vendedorFilter = '';
    let params = [];
    if (!isManager) {
      if (vendedorCol === 'vendedor_cliente') {
        if (user.nombre_vendedor) {
          vendedorFilter = `AND UPPER(${vendedorCol}) = UPPER($1)`;
          params = [user.nombre_vendedor];
        }
      } else {
        vendedorFilter = `AND ${vendedorCol} = $1`;
        params = [user.nombre_vendedor || user.rut];
      }
    }

    // Generar consulta de ventas con filtros dinámicos
    const baseParamCount = fechaParams.length;
    const queryVentas = `
      SELECT 
        TO_CHAR(${dateCol}, 'YYYY-MM') AS mes,
        COALESCE(SUM(${amountCol}), 0) AS ventas
      FROM ${salesTable}
      ${fechaFilter}
      ${vendedorFilter}
      GROUP BY TO_CHAR(${dateCol}, 'YYYY-MM')
      ORDER BY mes
    `;
    
    // Combinar parámetros de fecha y vendedor
    const allParams = [...fechaParams, ...params];
    
    // Ajustar vendedorFilter si hay parámetros de fecha
    let adjustedVendedorFilter = vendedorFilter;
    if (baseParamCount > 0 && vendedorFilter) {
      // Reemplazar $1 por $N donde N es baseParamCount + 1
      adjustedVendedorFilter = vendedorFilter.replace('$1', `$${baseParamCount + 1}`);
    }
    
    const finalQueryVentas = `
      SELECT 
        TO_CHAR(${dateCol}, 'YYYY-MM') AS mes,
        COALESCE(SUM(${amountCol}), 0) AS ventas
      FROM ${salesTable}
      ${fechaFilter}
      ${adjustedVendedorFilter}
      GROUP BY TO_CHAR(${dateCol}, 'YYYY-MM')
      ORDER BY mes
    `;
    
    const ventasResult = await pool.query(finalQueryVentas, allParams);

    // Obtener abonos (si existe tabla abono)
    const abonoTableCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abono') AS has_abono
    `);

    let abonosMap = {};
    if (abonoTableCheck.rows[0]?.has_abono) {
      const abonoColsQ = await pool.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'abono'
      `);
      const abonoCols = new Set(abonoColsQ.rows.map(r => r.column_name));
      
      let abonoAmountCol = null;
      let abonoDateCol = null;
      let abonoVendedorCol = null;

      if (abonoCols.has('monto')) abonoAmountCol = 'monto';
      else if (abonoCols.has('monto_abono')) abonoAmountCol = 'monto_abono';
      
      if (abonoCols.has('fecha_abono')) abonoDateCol = 'fecha_abono';
      else if (abonoCols.has('fecha')) abonoDateCol = 'fecha';
      
      if (abonoCols.has('vendedor_id')) abonoVendedorCol = 'vendedor_id';
      else if (abonoCols.has('vendedor_cliente')) abonoVendedorCol = 'vendedor_cliente';

        if (abonoAmountCol && abonoDateCol) {
        let abonoVendedorFilter = '';
        let abonoParams = [];
        if (!isManager && abonoVendedorCol) {
          if (abonoVendedorCol === 'vendedor_cliente') {
            if (user.nombre_vendedor) {
              abonoVendedorFilter = `AND UPPER(${abonoVendedorCol}) = UPPER($${fechaParams.length + 1})`;
              abonoParams = [user.nombre_vendedor];
            }
          } else {
            abonoVendedorFilter = `AND ${abonoVendedorCol} = $${fechaParams.length + 1}`;
            abonoParams = [user.nombre_vendedor || user.rut];
          }
        }

        // Construir filtro de fechas para abonos (igual que ventas)
        let abonoFechaFilter = fechaFilter.replace(new RegExp(dateCol, 'g'), abonoDateCol);
        
        const queryAbonos = `
          SELECT 
            TO_CHAR(${abonoDateCol}, 'YYYY-MM') AS mes,
            COALESCE(SUM(${abonoAmountCol}), 0) AS abonos
          FROM abono
          ${abonoFechaFilter}
          ${abonoVendedorFilter}
          GROUP BY TO_CHAR(${abonoDateCol}, 'YYYY-MM')
          ORDER BY mes
        `;
        const allAbonoParams = [...fechaParams, ...abonoParams];
        const abonosResult = await pool.query(queryAbonos, allAbonoParams);        abonosResult.rows.forEach(row => {
          abonosMap[row.mes] = parseFloat(row.abonos);
        });
      }
    }

    // Combinar ventas y abonos
    const evolucion = ventasResult.rows.map(row => ({
      mes: row.mes,
      ventas: parseFloat(row.ventas),
      abonos: abonosMap[row.mes] || 0
    }));

    res.json(evolucion);
  } catch (err) {
    console.error('Error en /api/kpis/evolucion-mensual:', err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   GET /api/kpis/ventas-por-familia
// @desc    Get sales grouped by product family
//          Supports optional params: ?limite=10 (default), ?meses=12, ?fechaInicio=YYYY-MM, ?fechaFin=YYYY-MM
// @access  Private
router.get('/ventas-por-familia', auth(), async (req, res) => {
  try {
    const { salesTable, amountCol, dateCol } = await getDetectedSales();
    if (!salesTable || !amountCol || !dateCol) {
      return res.json([]);
    }

    const user = req.user;
    const isManager = user.rol === 'MANAGER';

    // Parámetros opcionales
    const limite = parseInt(req.query.limite) || 10;
    const mesesAtras = parseInt(req.query.meses) || 12;
    const fechaInicio = req.query.fechaInicio; // YYYY-MM
    const fechaFin = req.query.fechaFin;       // YYYY-MM

    // Verificar si existe tabla producto y relación
    const productoTableCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'producto') AS has_producto
    `);

    if (!productoTableCheck.rows[0]?.has_producto) {
      return res.json([]);
    }

    // Detectar columnas
    const productoColsQ = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'producto'
    `);
    const productoCols = new Set(productoColsQ.rows.map(r => r.column_name));

    const salesColsQ = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = $1
    `, [salesTable]);
    const salesCols = new Set(salesColsQ.rows.map(r => r.column_name));

    let familiaCol = null;
    let productoIdCol = null;
    let salesProductoIdCol = null;

    // Detectar columna familia en producto
    if (productoCols.has('familia')) familiaCol = 'familia';
    else if (productoCols.has('familia_producto')) familiaCol = 'familia_producto';

    // Detectar ID de producto
    if (productoCols.has('id')) productoIdCol = 'id';
    else if (productoCols.has('codigo_producto')) productoIdCol = 'codigo_producto';

    // Detectar FK en ventas
    if (salesCols.has('producto_id')) salesProductoIdCol = 'producto_id';
    else if (salesCols.has('codigo_producto')) salesProductoIdCol = 'codigo_producto';

    if (!familiaCol || !productoIdCol || !salesProductoIdCol) {
      return res.json([]);
    }

    // Detectar vendedor column
    let vendedorCol = 'vendedor_id';
    const vendedorColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('vendedor_id', 'vendedor_cliente')
      LIMIT 1
    `, [salesTable]);
    if (vendedorColCheck.rows.length > 0) {
      vendedorCol = vendedorColCheck.rows[0].column_name;
    }

    // Filtro vendedor
    let vendedorFilter = '';
    let params = [];
    if (!isManager) {
      if (vendedorCol === 'vendedor_cliente') {
        if (user.nombre_vendedor) {
          vendedorFilter = `AND UPPER(s.${vendedorCol}) = UPPER($1)`;
          params = [user.nombre_vendedor];
        }
      } else {
        vendedorFilter = `AND s.${vendedorCol} = $1`;
        params = [user.nombre_vendedor || user.rut];
      }
    }

    // Construir filtro de fechas
    let fechaFilter = '';
    let fechaParams = [];
    
    if (fechaInicio && fechaFin) {
      // Rango específico
      const paramOffset = params.length + 1;
      fechaFilter = `AND s.${dateCol} >= $${paramOffset}::date AND s.${dateCol} < ($${paramOffset + 1}::text || '-01')::date + INTERVAL '1 month'`;
      fechaParams = [`${fechaInicio}-01`, fechaFin];
    } else if (fechaInicio) {
      // Desde una fecha
      const paramOffset = params.length + 1;
      fechaFilter = `AND s.${dateCol} >= $${paramOffset}::date`;
      fechaParams = [`${fechaInicio}-01`];
    } else {
      // Últimos N meses desde el último dato disponible
      const ultimoMesQuery = `SELECT TO_CHAR(MAX(${dateCol}), 'YYYY-MM') AS ultimo_mes FROM ${salesTable}`;
      const ultimoMesResult = await pool.query(ultimoMesQuery);
      const ultimoMes = ultimoMesResult.rows[0]?.ultimo_mes;
      
      if (ultimoMes) {
        const [year, month] = ultimoMes.split('-').map(Number);
        const fechaLimite = new Date(year, month - mesesAtras, 1).toISOString().slice(0, 7);
        const paramOffset = params.length + 1;
        fechaFilter = `AND s.${dateCol} >= $${paramOffset}::date`;
        fechaParams = [`${fechaLimite}-01`];
      } else {
        fechaFilter = `AND s.${dateCol} >= CURRENT_DATE - INTERVAL '${mesesAtras} months'`;
      }
    }

    // Query ventas por familia con filtros dinámicos
    const allParams = [...params, ...fechaParams];
    
    const query = `
      SELECT 
        p.${familiaCol} AS familia,
        COALESCE(SUM(s.${amountCol}), 0) AS total
      FROM ${salesTable} s
      INNER JOIN producto p ON s.${salesProductoIdCol} = p.${productoIdCol}
      WHERE 1=1
      ${fechaFilter}
      ${vendedorFilter}
      GROUP BY p.${familiaCol}
      ORDER BY total DESC
      LIMIT ${limite}
    `;
    
    const result = await pool.query(query, allParams);
    
    const ventasPorFamilia = result.rows.map(row => ({
      familia: row.familia || 'Sin familia',
      total: parseFloat(row.total)
    }));

    res.json(ventasPorFamilia);
  } catch (err) {
    console.error('Error en /api/kpis/ventas-por-familia:', err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

module.exports = router;
