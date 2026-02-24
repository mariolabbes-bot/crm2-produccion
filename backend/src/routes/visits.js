const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const ClientService = require('../services/clientService');

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

// Helper: Obtener clientes con Nota Cliente (HeatScore) calculada en 4 dimensiones
async function getClientsWithHeatscore(vendedorId) {
    const query = `
        WITH client_sales AS (
            SELECT 
                identificador AS rut,
                COALESCE(SUM(valor_total) / 12.0, 0) as prom_ventas,
                COUNT(DISTINCT TO_CHAR(fecha_emision, 'YYYY-MM')) as meses_con_venta
            FROM venta
            WHERE fecha_emision >= NOW() - INTERVAL '12 months'
            GROUP BY identificador
        ),
        client_debt AS (
            SELECT
                rut,
                COALESCE(SUM(saldo_factura), 0) as deuda_total,
                MAX(CURRENT_DATE - fecha_emision) as max_dias_mora
            FROM saldo_credito
            GROUP BY rut
        ),
        stats AS (
            SELECT 
                c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad, c.circuito,
                c.last_visit_date,
                COALESCE(cd.deuda_total, 0) as deuda_total,
                COALESCE(cd.max_dias_mora, 0) as dias_mora,
                COALESCE(cs.prom_ventas, 0) as prom_ventas,
                COALESCE(cs.meses_con_venta, 0) as meses_con_venta
            FROM cliente c
            LEFT JOIN client_sales cs ON c.rut = cs.rut
            LEFT JOIN client_debt cd ON c.rut = cd.rut
            WHERE c.vendedor_id = $1
        )
        SELECT * FROM stats
    `;
    const result = await pool.query(query, [vendedorId]);

    return result.rows.map(c => {
        const daysSinceVisit = c.last_visit_date ? Math.floor((new Date() - new Date(c.last_visit_date)) / (1000 * 60 * 60 * 24)) : 999;

        // 1. Volumen de venta (Promedio mensual últimos 12 meses)
        let notaVolumen = 4;
        if (c.prom_ventas > 1000000) notaVolumen = 10;
        else if (c.prom_ventas > 500000 && c.prom_ventas <= 1000000) notaVolumen = 7;

        // 2. Periodicidad de venta (Meses con compra en 12 meses)
        let notaPeriodicidad = 4;
        if (c.meses_con_venta >= 10) notaPeriodicidad = 10;
        else if (c.meses_con_venta >= 4 && c.meses_con_venta <= 9) notaPeriodicidad = 7;

        // 3. Saldo Crédito
        let notaSaldo = 4;
        if (c.deuda_total > 0) {
            const ratioDeuda = c.prom_ventas > 0 ? (c.deuda_total / c.prom_ventas) : 999;
            if (c.dias_mora >= 61) {
                notaSaldo = 10;
            } else if (c.dias_mora >= 30 && c.dias_mora <= 60) {
                if (ratioDeuda > 1.5 && ratioDeuda <= 2.5) {
                    notaSaldo = 7;
                } else if (ratioDeuda > 2.5) {
                    notaSaldo = 10;
                } else {
                    notaSaldo = 4;
                }
            } else if (c.dias_mora < 30) {
                if (ratioDeuda <= 1.5) {
                    notaSaldo = 4;
                } else {
                    notaSaldo = 7;
                }
            }
        }

        // 4. Última Visita
        let notaVisita = daysSinceVisit > 30 ? 10 : 4;

        // Promedio final de Nota Cliente (Score 4 a 10)
        // Convertiremos la escala 4-10 a una escala visual de calor 0-100 para el frontend:
        // Nota 10 -> 100, Nota 4 -> 0
        const rawScore = (notaVolumen + notaPeriodicidad + notaSaldo + notaVisita) / 4;
        const heatScore = ((rawScore - 4) / 6) * 100;

        return {
            ...c,
            heatScore: Math.round(heatScore), // 0 a 100
            rawScore, // 4 a 10
            daysSinceVisit
        };
    });
}

// GET /api/visits/heatmap - Datos para el mapa de calor
router.get('/heatmap', auth(), async (req, res) => {
    try {
        const isManager = req.user.rol.toUpperCase() === 'MANAGER';
        const vendedorId = req.query.vendedor_id || req.user.id;

        if (!isManager && String(vendedorId) !== String(req.user.id)) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const allScoredClients = await getClientsWithHeatscore(vendedorId);

        // El mapa solo puede pintar los que tienen latitud válida
        const mapData = allScoredClients.filter(c => c.latitud !== null && c.longitud !== null);

        res.json(mapData);
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

        // 1. Obtener todos los clientes del vendedor con su Score de Calor (Nota Cliente)
        const allScoredClients = await getClientsWithHeatscore(vendedorId);

        if (!allScoredClients || allScoredClients.length === 0) {
            return res.json([]);
        }

        // 2. Obtener visitas de hoy para filtrar
        const visitsQuery = `
            SELECT cliente_rut FROM visitas_registro 
            WHERE fecha = CURRENT_DATE AND vendedor_id = $1
        `;
        const visitsRes = await pool.query(visitsQuery, [vendedorId]);
        const visitedRuts = new Set(visitsRes.rows.map(v => v.cliente_rut));

        // 3. Filtrar: Solo clientes NO visitados hoy y Ordenar por mayor HeatScore (Urgencia) primero
        const suggestions = allScoredClients
            .filter(c => !visitedRuts.has(c.rut))
            .sort((a, b) => b.heatScore - a.heatScore)
            .slice(0, 100); // Retornar el Top 100 más urgente

        res.json(suggestions);

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
