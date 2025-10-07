const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET all activity types
// @route GET /api/activity-types
// @desc Get all activity types
// @access Private (any authenticated user)
router.get('/', auth(), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activity_types ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CREATE a new activity type
// @route POST /api/activity-types
// @desc Create a new activity type
// @access Private (manager only)
router.post('/', auth('manager'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ msg: 'El campo "nombre" es requerido' });
    }
    const newType = await pool.query(
      'INSERT INTO activity_types (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );
    res.status(201).json(newType.rows[0]);
  } catch (err) {
    console.error(err.message);
    // Check for unique constraint violation
    if (err.code === '23505') {
        return res.status(400).json({ msg: 'El tipo de actividad ya existe.' });
    }
    res.status(500).send('Server Error');
  }
});

// UPDATE an activity type
// @route PUT /api/activity-types/:id
// @desc Update an activity type
// @access Private (manager only)
router.put('/:id', auth('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ msg: 'El campo "nombre" es requerido' });
    }
    const updatedType = await pool.query(
      'UPDATE activity_types SET nombre = $1 WHERE id = $2 RETURNING *',
      [nombre, id]
    );
    if (updatedType.rows.length === 0) {
      return res.status(404).json({ msg: 'Tipo de actividad no encontrado' });
    }
    res.json(updatedType.rows[0]);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') {
        return res.status(400).json({ msg: 'El tipo de actividad ya existe.' });
    }
    res.status(500).send('Server Error');
  }
});

// DELETE an activity type
// @route DELETE /api/activity-types/:id
// @desc Delete an activity type
// @access Private (manager only)
router.delete('/:id', auth('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const deleteOp = await pool.query('DELETE FROM activity_types WHERE id = $1 RETURNING *', [id]);
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'Tipo de actividad no encontrado' });
    }
    res.json({ msg: 'Tipo de actividad eliminado' });
  } catch (err) {
    console.error(err.message);
    // Check for foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({ msg: 'No se puede eliminar el tipo de actividad porque está siendo utilizado por una o más actividades.' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
