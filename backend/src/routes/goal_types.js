const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET all goal types
router.get('/', auth(), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goal_types ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CREATE a new goal type
router.post('/', auth('manager'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ msg: 'El campo "nombre" es requerido' });
    }
    const newType = await pool.query(
      'INSERT INTO goal_types (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );
    res.status(201).json(newType.rows[0]);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') {
        return res.status(400).json({ msg: 'El tipo de objetivo ya existe.' });
    }
    res.status(500).send('Server Error');
  }
});

// UPDATE a goal type
router.put('/:id', auth('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ msg: 'El campo "nombre" es requerido' });
    }
    const updatedType = await pool.query(
      'UPDATE goal_types SET nombre = $1 WHERE id = $2 RETURNING *',
      [nombre, id]
    );
    if (updatedType.rows.length === 0) {
      return res.status(404).json({ msg: 'Tipo de objetivo no encontrado' });
    }
    res.json(updatedType.rows[0]);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') {
        return res.status(400).json({ msg: 'El tipo de objetivo ya existe.' });
    }
    res.status(500).send('Server Error');
  }
});

// DELETE a goal type
router.delete('/:id', auth('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOp = await pool.query('DELETE FROM goal_types WHERE id = $1 RETURNING *', [id]);
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'Tipo de objetivo no encontrado' });
    }
    res.json({ msg: 'Tipo de objetivo eliminado' });
  } catch (err) {
    console.error(err.message);
    if (err.code === '23503') {
      return res.status(400).json({ msg: 'No se puede eliminar el tipo de objetivo porque está siendo utilizado por uno o más objetivos.' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
