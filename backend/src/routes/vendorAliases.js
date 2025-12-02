const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Ensure table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuario_alias (
      id SERIAL PRIMARY KEY,
      alias VARCHAR(255) NOT NULL,
      nombre_vendedor_oficial VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// List aliases
router.get('/', auth(['manager']), async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query('SELECT id, alias, nombre_vendedor_oficial, created_at FROM usuario_alias ORDER BY alias ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create alias
router.post('/', auth(['manager']), async (req, res) => {
  try {
    await ensureTable();
    const { alias, nombre_vendedor_oficial } = req.body;
    if (!alias || !nombre_vendedor_oficial) return res.status(400).json({ success: false, msg: 'alias y nombre_vendedor_oficial son requeridos' });
    const { rows } = await pool.query('INSERT INTO usuario_alias (alias, nombre_vendedor_oficial) VALUES ($1, $2) RETURNING *', [alias, nombre_vendedor_oficial]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update alias
router.put('/:id', auth(['manager']), async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const { alias, nombre_vendedor_oficial } = req.body;
    const { rows } = await pool.query('UPDATE usuario_alias SET alias = $1, nombre_vendedor_oficial = $2 WHERE id = $3 RETURNING *', [alias, nombre_vendedor_oficial, id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete alias
router.delete('/:id', auth(['manager']), async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    await pool.query('DELETE FROM usuario_alias WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;