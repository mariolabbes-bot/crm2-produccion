const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// @route   GET /api/mobile/dashboard/summary
// @desc    Obtener resumen de KPIs para dashboard móvil (Ventas Hoy)
// @access  Private (Manager/Vendedor)
router.get('/dashboard/summary', auth, async (req, res) => {
    try {
        const { user_id, role, vendor_name } = req.user;

        // Determinar filtro de vendedor
        let vendorFilter = '';
        let params = [];

        // Si es vendedor, solo ve sus ventas
        if (role !== 'manager' && role !== 'admin') {
            // Usar vendor_name del token o buscar alias asociado
            // Por simplicidad inicial asumimos filtrado por nombre exacto o id
            // TODO: Refinar lógica de alias si es necesario, similar a dashboard web
            vendorFilter = 'AND "VENDEDOR" = $1';
            params.push(vendor_name);
        }

        // Ventas de Hoy
        // Asumiendo tabla "ventas" con columna "FECHA" (date) y "NETO" (numeric)
        const today = new Date().toISOString().split('T')[0];

        // Ajuste zona horaria si es necesario, por ahora UTC date

        const query = `
            SELECT 
                COALESCE(SUM("NETO"), 0) as venta_hoy,
                COUNT(*) as transacciones_hoy
            FROM ventas 
            WHERE "FECHA" = '${today}'::date
            ${vendorFilter}
        `;

        const result = await pool.query(query, params);

        res.json({
            venta_hoy: parseInt(result.rows[0].venta_hoy),
            transacciones_hoy: parseInt(result.rows[0].transacciones_hoy),
            fetched_at: new Date()
        });

    } catch (err) {
        console.error('Error en mobile dashboard summary:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
