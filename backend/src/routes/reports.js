const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

/**
 * GET /api/reports/portfolio-health
 * Salud de la cartera: Ventas vs Metas interanuales y promedio móvil
 */
router.get('/portfolio-health', auth(), async (req, res) => {
    try {
        const user = req.user;
        const isManager = (user.rol || '').toUpperCase() === 'MANAGER';
        let targetRut = isManager ? req.query.vendedor_id : user.rut;

        // Definición de fechas
        const now = new Date();
        const mesActual = now.toISOString().slice(0, 7); // YYYY-MM
        const anioAnt = now.getFullYear() - 1;
        const mesAnioAnt = `${anioAnt}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Últimos 3 meses completos
        const m1 = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
        const m2 = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 7);
        const m3 = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 7);

        const query = `
            WITH client_base AS (
                SELECT 
                    c.rut as clean_rut, 
                    REGEXP_REPLACE(c.rut, '[^a-zA-Z0-9]', '', 'g') as norm_rut,
                    c.nombre, 
                    u.nombre_vendedor, 
                    u.rut as vendedor_rut
                FROM cliente c
                LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
                WHERE ($1::text IS NULL OR u.rut = $1)
            ),
            ventas_actual AS (
                SELECT 
                    REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g') as norm_rut, 
                    SUM(valor_total) as total
                FROM venta
                WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $2
                GROUP BY 1
            ),
            ventas_anio_ant AS (
                SELECT 
                    COALESCE(REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g'), UPPER(TRIM(cliente))) as ref_key, 
                    SUM(valor_total) as total
                FROM venta
                WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $3
                GROUP BY 1
            ),
            ventas_3m AS (
                SELECT 
                    REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g') as norm_rut, 
                    SUM(valor_total) / 3.0 as promedio
                FROM venta
                WHERE TO_CHAR(fecha_emision, 'YYYY-MM') IN ($4, $5, $6)
                GROUP BY 1
            )
            SELECT 
                cb.clean_rut as rut, cb.nombre, cb.nombre_vendedor,
                COALESCE(va.total, 0) as venta_actual,
                COALESCE(vaa.total, 0) as meta_anio_ant,
                COALESCE(v3.promedio, 0) as promedio_3m,
                CASE 
                    WHEN COALESCE(v3.promedio, 0) > 0 AND COALESCE(va.total, 0) = 0 THEN 'fuga'
                    WHEN COALESCE(va.total, 0) < (COALESCE(v3.promedio, 0) * 0.5) THEN 'riesgo'
                    WHEN COALESCE(va.total, 0) >= COALESCE(vaa.total, 0) AND COALESCE(vaa.total, 0) > 0 THEN 'crecimiento'
                    ELSE 'estable'
                END as salud
            FROM client_base cb
            LEFT JOIN ventas_actual va ON cb.norm_rut = va.norm_rut
            LEFT JOIN ventas_anio_ant vaa ON (cb.norm_rut = vaa.ref_key OR UPPER(TRIM(cb.nombre)) = vaa.ref_key)
            LEFT JOIN ventas_3m v3 ON cb.norm_rut = v3.norm_rut
            WHERE (va.total > 0 OR vaa.total > 0 OR v3.promedio > 0)
            ORDER BY va.total DESC NULLS LAST
            LIMIT 100
        `;

        const result = await pool.query(query, [targetRut || null, mesActual, mesAnioAnt, m1, m2, m3]);
        res.json({ success: true, data: result.rows });

    } catch (err) {
        console.error('Error in portfolio-health report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/reports/management-effectiveness
 * Eficacia de gestión: Visitas planificadas vs Realizadas
 */
router.get('/management-effectiveness', auth(), async (req, res) => {
    try {
        const user = req.user;
        const isManager = (user.rol || '').toUpperCase() === 'MANAGER';
        let targetRut = isManager ? req.query.vendedor_id : user.rut;

        const query = `
            SELECT 
                u.nombre_vendedor,
                COUNT(vr.id) as total_visitas,
                SUM(CASE WHEN vr.planificada = TRUE THEN 1 ELSE 0 END) as planificadas,
                SUM(CASE WHEN vr.estado = 'completada' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN vr.planificada = TRUE AND vr.estado = 'completada' THEN 1 ELSE 0 END) as efectividad_plan
            FROM visitas_registro vr
            JOIN usuario u ON (vr.vendedor_id::text = u.id::text OR vr.vendedor_id::text = u.rut)
            WHERE ($1::text IS NULL OR u.rut = $1)
            AND vr.fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY 1
        `;

        const result = await pool.query(query, [targetRut || null]);
        res.json({ success: true, data: result.rows });

    } catch (err) {
        console.error('Error in management-effectiveness report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/reports/collection-priority
 * Priorización de recaudación: Deuda vs Volumen de venta
 */
router.get('/collection-priority', auth(), async (req, res) => {
    try {
        const user = req.user;
        const isManager = (user.rol || '').toUpperCase() === 'MANAGER';
        let targetRut = isManager ? req.query.vendedor_id : user.rut;

        const query = `
            WITH client_debt AS (
                SELECT 
                    REGEXP_REPLACE(rut, '[^a-zA-Z0-9]', '', 'g') as norm_rut, 
                    SUM(saldo_factura) as deuda_total,
                    MAX(CURRENT_DATE - fecha_emision) as dias_mora_max
                FROM saldo_credito
                WHERE saldo_factura > 0
                GROUP BY 1
            ),
            client_sales AS (
                SELECT 
                    REGEXP_REPLACE(identificador, '[^a-zA-Z0-9]', '', 'g') as norm_rut,
                    SUM(valor_total) / 12.0 as promedio_venta_mensual
                FROM venta
                WHERE fecha_emision >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY 1
            )
            SELECT 
                c.rut, c.nombre,
                cd.deuda_total,
                cd.dias_mora_max,
                cs.promedio_venta_mensual,
                u.nombre_vendedor,
                CASE 
                    WHEN cd.deuda_total > (cs.promedio_venta_mensual * 2) AND cd.dias_mora_max > 30 THEN 'prioridad_alta'
                    WHEN cd.dias_mora_max > 60 THEN 'prioridad_critica'
                    ELSE 'seguimiento'
                END as prioridad
            FROM cliente c
            JOIN client_debt cd ON REGEXP_REPLACE(c.rut, '[^a-zA-Z0-9]', '', 'g') = cd.norm_rut
            LEFT JOIN client_sales cs ON REGEXP_REPLACE(c.rut, '[^a-zA-Z0-9]', '', 'g') = cs.norm_rut
            LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
            WHERE ($1::text IS NULL OR u.rut = $1)
            ORDER BY cd.deuda_total DESC
            LIMIT 50
        `;

        const result = await pool.query(query, [targetRut || null]);
        res.json({ success: true, data: result.rows });

    } catch (err) {
        console.error('Error in collection-priority report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
