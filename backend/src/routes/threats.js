const express = require('express');
const router = express.Router();
const pool = require('../db');

// CRUD básico de amenazas
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM threats');
  res.json(result.rows);
});

module.exports = router;
