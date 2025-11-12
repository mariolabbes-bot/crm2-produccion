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
    if (cols.has('invoice_date')) dateCol = 'invoice_date';
    else if (cols.has('fecha_emision')) dateCol = 'fecha_emision';
    else if (cols.has('fecha')) dateCol = 'fecha';
    // Client FK
    if (cols.has('client_id')) clientIdCol = 'client_id';
    else if (cols.has('cliente_id')) clientIdCol = 'cliente_id';
  }

  detectedSales = { salesTable, amountCol, dateCol, clientIdCol };
  detectedAt = Date.now();
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

    // Determinar mes actual y mismo mes año anterior
    const now = new Date();
    const mesActual = now.toISOString().slice(0, 7); // YYYY-MM
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

    // Filtro vendedor
    let vendedorFilter = '';
    let params = [];
    if (!isManager) {
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
        if (!isManager && abonoVendedorCol) {
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

    res.json({
      success: true,
      data: {
        monto_ventas_mes: montoVentasMes,
        monto_abonos_mes: montoAbonosMes,
        variacion_vs_anio_anterior_pct: variacionPct,
        numero_clientes_con_venta_mes: numClientesConVenta
      }
    });
  } catch (err) {
    console.error('Error en /api/kpis/mes-actual:', err.message);
    res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
});

module.exports = router;
