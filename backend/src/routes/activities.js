const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// @route   GET /api/activities
// @desc    Get all activities for the user or all users if manager
// @access  Private
router.get('/', auth(), async (req, res) => {
  try {
    let query;
    const baseQuery = `
      SELECT 
        a.id, a.fecha, a.estado, a.notas,
        c.nombre AS client_name,
        at.nombre AS activity_type_name,
        u.nombre AS user_name
      FROM activities a
      JOIN cliente c ON a.cliente_id = c.id
      JOIN activity_types at ON a.activity_type_id = at.id
      JOIN usuario u ON a.usuario_id = u.id
    `;

    if (req.user.rol === 'manager') {
      query = pool.query(baseQuery + 'ORDER BY a.fecha DESC');
    } else {
      query = pool.query(baseQuery + 'WHERE a.usuario_id = $1 ORDER BY a.fecha DESC', [req.user.id]);
    }
    const result = await query;
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/activities/:id
// @desc    Get a single activity with its goals
// @access  Private
router.get('/:id', auth(), async (req, res) => {
  try {
    const activityResult = await pool.query('SELECT * FROM activities WHERE id = $1', [req.params.id]);
    if (activityResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Activity not found' });
    }
    const activity = activityResult.rows[0];

    // Check ownership for non-manager
    if (req.user.rol !== 'manager' && activity.usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const goalsResult = await pool.query('SELECT * FROM goals WHERE activity_id = $1', [req.params.id]);
    activity.goals = goalsResult.rows;

    res.json(activity);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/activities/overdue
// @desc    Get overdue activities
// @access  Private
router.get('/overdue', auth(), async (req, res) => {
  try {
    let query;
    const baseQuery = `
      SELECT 
        a.id, a.fecha, a.estado, a.notas,
        c.nombre AS client_name,
        at.nombre AS activity_type_name,
        u.nombre AS user_name
      FROM activities a
      JOIN cliente c ON a.cliente_id = c.id
      JOIN activity_types at ON a.activity_type_id = at.id
      JOIN usuario u ON a.usuario_id = u.id
      WHERE a.estado = 'abierto' AND a.fecha < NOW()
    `;

    if (req.user.rol === 'manager') {
      query = pool.query(baseQuery + 'ORDER BY a.fecha ASC');
    } else {
      query = pool.query(baseQuery + 'AND a.usuario_id = $1 ORDER BY a.fecha ASC', [req.user.id]);
    }
    const result = await query;
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   POST /api/activities
// @desc    Create a new activity and its associated goals
// @access  Private
router.post('/', auth(), async (req, res) => {
  const { cliente_id, activity_type_id, fecha, notas, goals } = req.body;
  const usuario_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el vendedor tenga acceso al cliente
    if (req.user.rol !== 'manager') {
      const clientCheck = await client.query('SELECT id FROM cliente WHERE id = $1 AND vendedor_id = $2', [cliente_id, req.user.id]);
      if (clientCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ msg: 'No tienes acceso a este cliente' });
      }
    }

    const newActivity = await client.query(
      'INSERT INTO activities (usuario_id, cliente_id, activity_type_id, fecha, notas) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [usuario_id, cliente_id, activity_type_id, fecha, notas]
    );
    const activityId = newActivity.rows[0].id;

    if (goals && goals.length > 0) {
      for (const goal of goals) {
        await client.query(
          'INSERT INTO goals (activity_id, goal_type_id, descripcion, estado) VALUES ($1, $2, $3, $4)',
          [activityId, goal.goal_type_id, goal.descripcion, 'pendiente']
        );
      }
    }

    await client.query('COMMIT');

    // Refetch the created activity with its goals
    const finalResult = await client.query('SELECT * FROM activities WHERE id = $1', [activityId]);
    const finalGoals = await client.query('SELECT * FROM goals WHERE activity_id = $1', [activityId]);
    const response = finalResult.rows[0];
    response.goals = finalGoals.rows;

    res.status(201).json(response);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// @route   PUT /api/activities/:id/close
// @desc    Close an activity
// @access  Private
router.put('/:id/close', auth(), async (req, res) => {
  const { resultado_objetivos, tareas_seguimiento, siguiente_actividad_id } = req.body;
  try {
    const activityResult = await pool.query('SELECT * FROM activities WHERE id = $1', [req.params.id]);
    if (activityResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Activity not found' });
    }
    const activity = activityResult.rows[0];

    if (req.user.rol !== 'manager' && activity.usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const updatedActivity = await pool.query(
      'UPDATE activities SET estado = $1, resultado_objetivos = $2, tareas_seguimiento = $3, siguiente_actividad_id = $4 WHERE id = $5 RETURNING *',
      ['cerrado', resultado_objetivos, tareas_seguimiento, siguiente_actividad_id, req.params.id]
    );

    res.json(updatedActivity.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/activities/:id
// @desc    Update an activity
// @access  Private
router.put('/:id', auth(), async (req, res) => {
  const { cliente_id, activity_type_id, fecha, notas } = req.body;
  try {
    const activityResult = await pool.query('SELECT * FROM activities WHERE id = $1', [req.params.id]);
    if (activityResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Activity not found' });
    }
    const activity = activityResult.rows[0];

    if (req.user.rol !== 'manager' && activity.usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Verificar que el vendedor tenga acceso al nuevo cliente si se cambia
    if (req.user.rol !== 'manager' && cliente_id !== activity.cliente_id) {
      const clientCheck = await pool.query('SELECT id FROM cliente WHERE id = $1 AND vendedor_id = $2', [cliente_id, req.user.id]);
      if (clientCheck.rows.length === 0) {
        return res.status(403).json({ msg: 'No tienes acceso a este cliente' });
      }
    }

    const updatedActivity = await pool.query(
      'UPDATE activities SET cliente_id = $1, activity_type_id = $2, fecha = $3, notas = $4 WHERE id = $5 RETURNING *',
      [cliente_id, activity_type_id, fecha, notas, req.params.id]
    );

    res.json(updatedActivity.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete an activity
// @access  Private
router.delete('/:id', auth(), async (req, res) => {
  try {
    const activityResult = await pool.query('SELECT * FROM activities WHERE id = $1', [req.params.id]);
    if (activityResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Activity not found' });
    }
    const activity = activityResult.rows[0];

    if (req.user.rol !== 'manager' && activity.usuario_id !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    await pool.query('DELETE FROM activities WHERE id = $1', [req.params.id]);
    res.json({ msg: 'Activity deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/activities/report
// @desc    Export activities to CSV for Managers
// @access  Private (Manager only)
router.get('/report', auth(), async (req, res) => {
  try {
    if (req.user.rol !== 'manager') {
      return res.status(403).json({ msg: 'Acceso denegado. Solo gerentes pueden exportar reportes.' });
    }

    const { vendedor_id, inicio, fin } = req.query;

    let query = `
      SELECT 
        ca.created_at as fecha,
        ua.alias as vendedor,
        ca.cliente_rut as rut_cliente,
        c.nombre as nombre_cliente,
        at.nombre as tipo,
        ca.comentario
      FROM cliente_actividad ca
      JOIN usuario_alias ua ON ca.usuario_alias_id = ua.id
      JOIN cliente c ON ca.cliente_rut = c.rut
      LEFT JOIN activity_types at ON ca.activity_type_id = at.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (vendedor_id) {
      query += ` AND ca.usuario_alias_id = $${pIdx++}`;
      params.push(vendedor_id);
    }
    if (inicio) {
      query += ` AND ca.created_at >= $${pIdx++}`;
      params.push(inicio);
    }
    if (fin) {
      query += ` AND ca.created_at <= $${pIdx++}`;
      params.push(fin);
    }

    query += ` ORDER BY ca.created_at DESC`;

    const result = await pool.query(query, params);

    // Generar CSV manualmente para evitar dependencias bloqueadas
    const headers = ['Fecha', 'Vendedor', 'RUT Cliente', 'Nombre Cliente', 'Tipo', 'Comentario'];
    const rows = result.rows.map(r => [
      new Date(r.fecha).toLocaleString('es-CL'),
      r.vendedor,
      r.rut_cliente,
      r.nombre_cliente,
      r.tipo || 'NOTA',
      `"${(r.comentario || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_actividades_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (err) {
    console.error('Error generando reporte:', err.message);
    res.status(500).send('Server Error generating report');
  }
});

module.exports = router;