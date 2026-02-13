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

// Helper: Calcular distancia Haversine en metros
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // Radio tierra en metros
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// POST /api/visits/check-in - Registrar inicio de visita con validación de distancia
router.post('/check-in', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.id;
        const { cliente_rut, latitud, longitud } = req.body;

        // 1. Obtener coordenadas del cliente para validar
        const clienteQuery = 'SELECT latitud, longitud FROM cliente WHERE rut = $1';
        const clienteRes = await pool.query(clienteQuery, [cliente_rut]);

        let distancia = null;
        let warning = null;

        if (clienteRes.rows.length > 0) {
            const c = clienteRes.rows[0];
            distancia = getDistanceFromLatLonInM(latitud, longitud, parseFloat(c.latitud), parseFloat(c.longitud));

            // Validar Geocerca (ej: 200 metros)
            if (distancia && distancia > 200) {
                warning = `Estás a ${Math.round(distancia)}m del cliente. ¿Seguro que estás en el local?`;
            }
        }

        const query = `
            INSERT INTO visitas_registro (vendedor_id, cliente_rut, fecha, hora_inicio, latitud_inicio, longitud_inicio, estado, distancia_checkin)
            VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3, $4, 'en_progreso', $5)
            RETURNING *
        `;
        const result = await pool.query(query, [vendedorId, cliente_rut, latitud, longitud, distancia]);

        const responseData = {
            ...result.rows[0],
            warning // Enviar warning al frontend si existe
        };

        res.status(201).json(responseData);
    } catch (err) {
        console.error('Error check-in:', err.message);
        res.status(500).json({ msg: 'Server Error check-in' });
    }
});

// GET /api/visits/suggestions - Obtener sugerencias para planificación
router.get('/suggestions', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.id;
        // Lógica simple de sugerencia: Clientes del vendedor sin visita hoy
        // TODO: Refinar con "Deuda > X" o "No visitado en Y días"
        const query = `
            SELECT c.rut, c.nombre, c.direccion, c.comuna, c.latitud, c.longitud, c.circuito,
                   (SELECT COUNT(*) FROM visitas_registro v WHERE v.cliente_rut = c.rut AND v.fecha > CURRENT_DATE - 30) as visitas_ultimo_mes
            FROM cliente c
            WHERE c.vendedor_id = (SELECT id FROM usuario WHERE id = $1) -- Asumiendo vendedor_id es ID usuario
            AND NOT EXISTS (
                SELECT 1 FROM visitas_registro vr 
                WHERE vr.cliente_rut = c.rut AND vr.fecha = CURRENT_DATE
            )
            LIMIT 50
        `;
        // Nota: Ajustar la subquery de vendedor_id según tu esquema real de usuarios/vendedores
        // Si c.nombre_vendedor es string, habría que hacer join con usuario. 
        // Asumiremos por ahora que podemos filtrar por vendedor de alguna forma.
        // Si no hay relación directa ID, usar nombre:
        // WHERE c.nombre_vendedor = (SELECT nombre FROM usuario WHERE id = $1)

        // FALLBACK SIMPLE: Traer todos los clientes (o filtrar por nombre si es posible)
        // Para este MVP, traeremos clientes donde el nombre del vendedor coincida o todos si es manager.
        const userQuery = 'SELECT nombre_vendedor FROM usuario WHERE id = $1';
        const userRes = await pool.query(userQuery, [vendedorId]);

        if (userRes.rows.length === 0) {
            return res.json([]);
        }

        const nombreVendedor = userRes.rows[0].nombre_vendedor;

        const suggestionsQuery = `
            SELECT c.rut, c.nombre, c.direccion, c.comuna, c.circuito, c.deuda_total, c.latitud, c.longitud
            FROM cliente c
            WHERE c.nombre_vendedor ILIKE $1
            AND NOT EXISTS (
                SELECT 1 FROM visitas_registro vr 
                WHERE vr.cliente_rut = c.rut AND vr.fecha = CURRENT_DATE
            )
            LIMIT 50
        `;

        const suggestions = await pool.query(suggestionsQuery, [`%${nombreVendedor}%`]);
        res.json(suggestions.rows);

    } catch (err) {
        console.error('Error suggestions:', err.message);
        res.status(500).send('Server Error suggestions');
    }
});

// POST /api/visits/plan - Guardar planificación del día
router.post('/plan', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.id;
        const { clientes } = req.body; // Array de RUTs

        if (!clientes || !Array.isArray(clientes)) {
            return res.status(400).json({ msg: 'Lista de clientes inválida' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const rut of clientes) {
                // Verificar si ya existe para no duplicar
                const check = await client.query(
                    'SELECT id FROM visitas_registro WHERE vendedor_id = $1 AND cliente_rut = $2 AND fecha = CURRENT_DATE',
                    [vendedorId, rut]
                );

                if (check.rows.length === 0) {
                    await client.query(
                        `INSERT INTO visitas_registro (vendedor_id, cliente_rut, fecha, estado, planificada, prioridad_sugerida)
                         VALUES ($1, $2, CURRENT_DATE, 'pendiente', TRUE, 1)`,
                        [vendedorId, rut]
                    );
                }
            }

            await client.query('COMMIT');
            res.json({ msg: 'Planificación guardada', count: clientes.length });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Error planning:', err.message);
        res.status(500).send('Server Error planning');
    }
});

// POST /api/visits/check-out - Registrar fin de visita
router.post('/check-out', auth(), async (req, res) => {
    try {
        const { visita_id, latitud, longitud, resultado, notas } = req.body;

        const query = `
            UPDATE visitas_registro 
            SET hora_fin = CURRENT_TIME, 
                latitud_fin = $1, 
                longitud_fin = $2, 
                estado = 'completada',
                resultado = $3,
                notas = $4
            WHERE id = $5
            RETURNING *
        `;
        const result = await pool.query(query, [latitud, longitud, resultado, notas, visita_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Visita no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error check-out:', err.message);
        res.status(500).json({ msg: 'Server Error check-out' });
    }
});

// GET /api/visits/my-today - Obtener visitas del día actual para el vendedor
router.get('/my-today', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.id;
        const query = `
            SELECT 
                v.*, 
                c.nombre as cliente_nombre, 
                c.direccion as cliente_direccion
            FROM visitas_registro v
            LEFT JOIN cliente c ON v.cliente_rut = c.rut
            WHERE v.vendedor_id = $1 
            AND v.fecha = CURRENT_DATE
            ORDER BY 
                CASE WHEN v.estado = 'en_progreso' THEN 0
                     WHEN v.estado = 'pendiente' THEN 1
                     ELSE 2 END,
                v.planificada DESC, 
                v.id ASC
        `;
        const result = await pool.query(query, [vendedorId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error my-today:', err.message);
        res.status(500).send('Server Error my-today');
    }
});

module.exports = router;
