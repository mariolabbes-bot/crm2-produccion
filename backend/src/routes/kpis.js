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

    if (req.user.rol === 'manager') {
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
      const result = await pool.query(query, [req.user.id]);
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

    if (req.user.rol === 'manager') {
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
      const result = await pool.query(query, [req.user.id]);
      return res.json(result.rows[0] || { total_sales: 0 });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
