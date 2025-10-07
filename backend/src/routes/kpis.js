const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// @route   GET /api/kpis/top-clients
// @desc    Get top 5 clients by sales
// @access  Private
router.get('/top-clients', auth(), async (req, res) => {
  try {
    const query = `
      SELECT c.nombre, SUM(s.net_amount) AS total_sales
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      GROUP BY c.nombre
      ORDER BY total_sales DESC
      LIMIT 5;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
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
    const query = `
      SELECT SUM(net_amount) AS total_sales
      FROM sales
      WHERE invoice_date >= NOW() - INTERVAL '3 months';
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
