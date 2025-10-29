const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// @route GET /api/goals
// @desc  Listar todos los objetivos con joins enriquecidos
// @access Private
router.get('/', auth(), async (req, res) => {
  try {
    // Si es vendedor, limitar a objetivos de actividades del usuario
    const baseQuery = `SELECT g.id, g.descripcion, g.estado, g.goal_type_id,
      gt.nombre AS type_name,
      a.id AS activity_id, a.fecha AS activity_date,
      c.id AS client_id, c.nombre AS client_name,
      u.id AS user_id, u.nombre AS user_name
      FROM goals g
      JOIN goal_types gt ON gt.id = g.goal_type_id
      JOIN activities a ON a.id = g.activity_id
      JOIN cliente c ON c.id = a.cliente_id
      JOIN usuario u ON u.id = a.usuario_id`;
    let where = '';
    const params = [];
    if (req.user.rol !== 'manager') {
      where = ' WHERE a.usuario_id = $1';
      params.push(req.user.id);
    }
    const order = ' ORDER BY g.id DESC';
    const result = await pool.query(baseQuery + where + order, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/goals/activity/:activityId
// @desc    Get all goals for a specific activity
// @access  Private
router.get('/activity/:activityId', auth(), async (req, res) => {
  try {
    // First, check if the user has access to the activity
    const activityResult = await pool.query('SELECT usuario_id FROM activities WHERE id = $1', [req.params.activityId]);
    if (activityResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Activity not found' });
    }
    if (req.user.rol !== 'manager' && activityResult.rows[0].usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const result = await pool.query('SELECT * FROM goals WHERE activity_id = $1 ORDER BY id DESC', [req.params.activityId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/goals
// @desc    Create a new goal for an activity
// @access  Private
router.post('/', auth(), async (req, res) => {
  let { activity_id, goal_type_id, descripcion, estado, cliente_id } = req.body;
  estado = estado || 'Pendiente';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Si no viene activity_id pero sí cliente_id, crear actividad placeholder.
    if (!activity_id && cliente_id) {
      // Obtener un activity_type_id por defecto (el primero existente)
      const typeRes = await client.query('SELECT id FROM activity_types ORDER BY id ASC LIMIT 1');
      if (typeRes.rows.length === 0) {
        return res.status(400).json({ msg: 'No hay tipos de actividad definidos para crear actividad placeholder.' });
      }
      const activityTypeId = typeRes.rows[0].id;
      const newActivity = await client.query(
        'INSERT INTO activities (usuario_id, cliente_id, activity_type_id, fecha, notas, estado) VALUES ($1,$2,$3,NOW(),$4,$5) RETURNING id',
        [req.user.id, cliente_id, activityTypeId, 'Creada automáticamente para objetivo', 'abierto']
      );
      activity_id = newActivity.rows[0].id;
    }

    // Validar acceso a la actividad
    const activityResult = await client.query('SELECT usuario_id FROM activities WHERE id = $1', [activity_id]);
    if (activityResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Activity not found' });
    }
    if (req.user.rol !== 'manager' && activityResult.rows[0].usuario_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ msg: 'Access denied' });
    }

    const newGoal = await client.query(
      'INSERT INTO goals (activity_id, goal_type_id, descripcion, estado) VALUES ($1,$2,$3,$4) RETURNING *',
      [activity_id, goal_type_id, descripcion, estado]
    );
    await client.query('COMMIT');
    res.status(201).json(newGoal.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// @route   PUT /api/goals/:id
// @desc    Update a goal (e.g., its state)
// @access  Private
router.put('/:id', auth(), async (req, res) => {
  const { descripcion, estado } = req.body;
  try {
    // Check ownership via the activity
    const goalResult = await pool.query('SELECT activity_id FROM goals WHERE id = $1', [req.params.id]);
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    const { activity_id } = goalResult.rows[0];

    const activityResult = await pool.query('SELECT usuario_id FROM activities WHERE id = $1', [activity_id]);
    if (req.user.rol !== 'manager' && activityResult.rows[0].usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const updatedGoal = await pool.query(
      'UPDATE goals SET descripcion = $1, estado = $2 WHERE id = $3 RETURNING *',
      [descripcion, estado, req.params.id]
    );

    res.json(updatedGoal.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
// @access  Private
router.delete('/:id', auth(), async (req, res) => {
  try {
    // Check ownership via the activity
    const goalResult = await pool.query('SELECT activity_id FROM goals WHERE id = $1', [req.params.id]);
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    const { activity_id } = goalResult.rows[0];

    const activityResult = await pool.query('SELECT usuario_id FROM activities WHERE id = $1', [activity_id]);
    if (req.user.rol !== 'manager' && activityResult.rows[0].usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    await pool.query('DELETE FROM goals WHERE id = $1', [req.params.id]);
    res.json({ msg: 'Goal deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;