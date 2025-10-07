const express = require('express');
const router = express.Router();
const pool = require('../db');

// CRUD básico de oportunidades
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM opportunities');
  res.json(result.rows);
});

module.exports = router;
