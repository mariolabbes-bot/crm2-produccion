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

// Seed aliases with known mappings
router.post('/seed', auth(['manager']), async (req, res) => {
  try {
    await ensureTable();
    
    // Clear existing aliases
    await pool.query('TRUNCATE TABLE usuario_alias');
    
    // Insert known mappings
    const aliases = [
      ['Alex Mondaca', 'Alex Mauricio Mondaca Cortes'],
      ['Eduardo Ponce', 'Eduardo Enrique Ponce Castillo'],
      ['Eduardo Rojas Rojas', 'Eduardo Rojas Andres Rojas Del Campo'],
      ['Emilio Santos', 'Emilio Alberto Santos Castillo'],
      ['JOAQUIN MANRIQUEZ', 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA'],
      ['Jorge Gutierrez', 'Jorge Heriberto Gutierrez Silva'],
      ['Luis Esquivel', 'Luis Ramon Esquivel Oyamadel'],
      ['Maiko Flores', 'Maiko Ricardo Flores Maldonado'],
      ['Marcelo Troncoso', 'Marcelo Hernan Troncoso Molina'],
      ['Marisol Sanchez', 'Marisol De Lourdes Sanchez Roitman'],
      ['Matias Felipe Tapia', 'Matias Felipe Felipe Tapia Valenzuela'],
      ['Milton Marin', 'Milton Marin Blanco'],
      ['Nataly Carrasco', 'Nataly Andrea Carrasco Rojas'],
      ['Nelson Muñoz', 'Nelson Antonio Muñoz Cortes'],
      ['Nelson Mu√±oz', 'Nelson Antonio Muñoz Cortes'],
      ['Omar Maldonado', 'Omar Antonio Maldonado Castillo'],
      ['Roberto Oyarzun', 'Roberto Otilio Oyarzun Alvarez'],
      ['Victoria Hurtado', 'Victoria Andrea Hurtado Olivares']
    ];
    
    for (const [alias, oficial] of aliases) {
      await pool.query(
        'INSERT INTO usuario_alias (alias, nombre_vendedor_oficial) VALUES ($1, $2)',
        [alias, oficial]
      );
    }
    
    res.json({ success: true, msg: 'Aliases cargados exitosamente', count: aliases.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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