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
        ca.id, ca.created_at as fecha, 'cerrado' as estado, ca.comentario as notas,
        c.nombre AS client_name,
        at.nombre AS activity_type_name,
        ua.alias AS user_name
      FROM cliente_actividad ca
      JOIN cliente c ON ca.cliente_rut = c.rut
      LEFT JOIN activity_types at ON ca.activity_type_id = at.id
      JOIN usuario_alias ua ON ca.usuario_alias_id = ua.id
    `;

    if (req.user.rol === 'manager') {
      query = pool.query(baseQuery + ' ORDER BY ca.created_at DESC LIMIT 100');
    } else {
      // Intentar filtrar por el alias del usuario actual
      query = pool.query(baseQuery + ' WHERE ua.vendedor_id_oficial::text = $1 ORDER BY ca.created_at DESC LIMIT 100', [req.user.rut]);
    }
    const result = await query;
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET /api/activities:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/activities/:id
// @desc    Get a single activity
router.get('/:id', auth(), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ca.*, c.nombre as client_name FROM cliente_actividad ca JOIN cliente c ON ca.cliente_rut = c.rut WHERE ca.id = $1', 
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Activity not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/activities
// @desc    Create a new activity (mirror of createClientActividad)
router.post('/', auth(), async (req, res) => {
  const { cliente_rut, activity_type_id, comentario } = req.body;
  try {
    const aliasRes = await pool.query(
      'SELECT id FROM usuario_alias WHERE vendedor_id_oficial::text = $1 LIMIT 1',
      [req.user.rut]
    );
    const uaId = aliasRes.rows[0]?.id;

    const result = await pool.query(
      'INSERT INTO cliente_actividad (cliente_rut, usuario_alias_id, comentario, activity_type_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [cliente_rut, uaId, comentario, activity_type_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Nota: Se han removido las rutas de Goals y Updates complejos ya que la tabla 'activities' original no existe 
// y el sistema actual usa 'cliente_actividad' como un log inmutable de historial.

// @route   GET /api/activities/report
// @desc    Export activities to CSV for Managers
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