const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/visits/plans/today - Obtener plan de hoy para el vendedor logueado
router.get('/plans/today', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.id;
        const query = `
            SELECT * FROM visit_plans 
            WHERE vendedor_id = $1 AND fecha = CURRENT_DATE
            ORDER BY created_at DESC LIMIT 1
        `;
        const result = await pool.query(query, [vendedorId]);
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/visits/plans - Crear o actualizar plan de hoy
router.post('/plans', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.id;
        const { clientes_json, notas } = req.body;

        const query = `
            INSERT INTO visit_plans (vendedor_id, fecha, clientes_json, notas)
            VALUES ($1, CURRENT_DATE, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
                clientes_json = EXCLUDED.clientes_json,
                notas = EXCLUDED.notas,
                updated_at = NOW()
            RETURNING *
        `;
        const result = await pool.query(query, [vendedorId, JSON.stringify(clientes_json), notas]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/visits/heatmap - Datos para el mapa de calor
router.get('/heatmap', auth(), async (req, res) => {
    try {
        const isManager = req.user.rol.toUpperCase() === 'MANAGER';
        const vendedorId = req.query.vendedor_id || req.user.id;

        // Si no es manager y quiere ver otro, denegar (a menos que haya otra lógica)
        if (!isManager && vendedorId !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        // Consulta para obtener clientes con sus coordenadas y KPIs básicos
        // Calcularemos el HeatScore en memoria o en la query si es posible
        const query = `
            WITH stats AS (
                SELECT 
                    c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad,
                    c.last_visit_date,
                    COALESCE(SUM(sc.saldo_factura), 0) as deuda_total,
                    (SELECT COALESCE(SUM(v.valor_total), 0) / 3.0 
                     FROM venta v WHERE v.vendedor_cliente = u.nombre_vendedor 
                     AND v.fecha_emision >= NOW() - INTERVAL '3 months') as prom_ventas
                FROM cliente c
                LEFT JOIN usuario u ON c.vendedor_id = u.id
                LEFT JOIN saldo_credito sc ON c.rut = sc.rut
                WHERE c.vendedor_id = $1 AND c.latitud IS NOT NULL
                GROUP BY c.id, c.rut, c.nombre, c.latitud, u.nombre_vendedor
            )
            SELECT * FROM stats
        `;
        const result = await pool.query(query, [vendedorId]);

        // Calcular HeatScore rápido en Node para flexibilidad
        const data = result.rows.map(c => {
            const daysSinceVisit = c.last_visit_date ? Math.floor((new Date() - new Date(c.last_visit_date)) / (1000 * 60 * 60 * 24)) : 999;

            // Pesos: Recencia 40, Deuda 30, Valor 30
            const recencyScore = daysSinceVisit > 30 ? 100 : (daysSinceVisit / 30) * 100;
            const debtScore = Math.min(100, (c.deuda_total / 1000000) * 100); // Normalizado a 1M
            const valueScore = Math.min(100, (c.prom_ventas / 500000) * 100); // Normalizado a 500k

            const heatScore = (recencyScore * 0.4) + (debtScore * 0.3) + (valueScore * 0.3);

            return {
                ...c,
                heatScore: Math.round(heatScore),
                daysSinceVisit
            };
        });

        res.json(data);
    } catch (err) {
        console.error('Error heatmap:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
