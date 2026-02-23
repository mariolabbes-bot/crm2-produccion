const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/circuits - Listar todos los circuitos operativos
router.get('/', auth(), async (req, res) => {
    try {
        const query = 'SELECT * FROM maestro_circuitos ORDER BY nombre ASC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching circuits:', error);
        res.status(500).json({ error: 'Error al obtener circuitos' });
    }
});

// POST /api/circuits - Crear un nuevo circuito (Solo Manager)
router.post('/', auth(['manager']), async (req, res) => {
    const { nombre, color, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre es requerido' });

    try {
        const query = `
      INSERT INTO maestro_circuitos (nombre, color, descripcion)
      VALUES ($1, $2, $3)
      ON CONFLICT (nombre) DO UPDATE SET
        color = EXCLUDED.color,
        descripcion = EXCLUDED.descripcion
      RETURNING *
    `;
        const result = await pool.query(query, [nombre.toUpperCase(), color, descripcion]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating circuit:', error);
        res.status(500).json({ error: 'Error al crear circuito' });
    }
});

// PUT /api/circuits/:id - Editar un circuito (Solo Manager)
router.put('/:id', auth(['manager']), async (req, res) => {
    const { id } = req.params;
    const { nombre, color, descripcion } = req.body;

    try {
        const query = `
      UPDATE maestro_circuitos 
      SET nombre = COALESCE($1, nombre),
          color = COALESCE($2, color),
          descripcion = COALESCE($3, descripcion)
      WHERE id = $4
      RETURNING *
    `;
        const result = await pool.query(query, [nombre ? nombre.toUpperCase() : null, color, descripcion, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Circuito no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating circuit:', error);
        res.status(500).json({ error: 'Error al actualizar circuito' });
    }
});

// DELETE /api/circuits/:id - Borrar un circuito (Solo Manager)
router.delete('/:id', auth(['manager']), async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar si el circuito tiene clientes asociados antes de borrar
        const checkQuery = 'SELECT COUNT(*) FROM cliente WHERE circuito = (SELECT nombre FROM maestro_circuitos WHERE id = $1)';
        const checkRes = await pool.query(checkQuery, [id]);

        if (parseInt(checkRes.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'No se puede borrar el circuito porque tiene clientes asociados. Reasigne los clientes primero.'
            });
        }

        const deleteQuery = 'DELETE FROM maestro_circuitos WHERE id = $1 RETURNING *';
        const result = await pool.query(deleteQuery, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Circuito no encontrado' });

        res.json({ message: 'Circuito eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting circuit:', error);
        res.status(500).json({ error: 'Error al eliminar circuito' });
    }
});

module.exports = router;
