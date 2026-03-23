const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { refreshSucursalAliasCache } = require('../services/sucursalAliasService');

// GET /api/sucursal-aliases
router.get('/', auth(), async (req, res) => {
    try {
        // Ejecución en la nube para asegurar que la tabla exista (Self-Healing)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sucursal_alias (
                id SERIAL PRIMARY KEY,
                valor_excel VARCHAR(255) UNIQUE NOT NULL,
                sucursal_real VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const result = await pool.query('SELECT * FROM sucursal_alias ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error fetching sucursal aliases:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/sucursal-aliases
router.post('/', auth(['manager']), async (req, res) => {
    const { valor_excel, sucursal_real } = req.body;
    if (!valor_excel || !sucursal_real) {
        return res.status(400).json({ success: false, error: 'Faltan campos valor_excel o sucursal_real' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO sucursal_alias (valor_excel, sucursal_real)
            VALUES ($1, $2)
            RETURNING *
        `, [valor_excel.trim(), sucursal_real.trim()]);
        
        await refreshSucursalAliasCache(); // Update memory Map
        
        res.json({ success: true, data: result.rows[0], message: 'Alias guardado y caché recargada.' });
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ success: false, error: 'Ese valor de Excel ya existe en el diccionario.' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/sucursal-aliases/:id
router.delete('/:id', auth(['manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM sucursal_alias WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Alias no encontrado' });
        }

        await refreshSucursalAliasCache(); // Update memory Map
        
        res.json({ success: true, message: 'Alias eliminado y caché recargada.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
