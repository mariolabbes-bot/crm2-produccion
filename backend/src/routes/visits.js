const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const ClientService = require('../services/clientService');
const { enqueueVisitMonitor } = require('../workers/visitMonitorWorker');

// GET /api/visits/plans/today - Obtener plan de hoy para el vendedor logueado
router.get('/plans/today', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut; // Cambiado a rut para consistencia
        const query = `
            SELECT * FROM visit_plans 
            WHERE (vendedor_id::text = $1) AND fecha = CURRENT_DATE
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
        const vendedorId = req.user.rut; // Cambiado a rut para consistencia
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

async function syncToClientActivity(pool, data) {
    const { cliente_rut, vendedor_id, comentario, activity_type_id, status } = data;
    try {
        const vId = vendedor_id ? vendedor_id.toString() : '';
        if (!vId) return;

        // Paso 1: Buscar el nombre completo del usuario usando su RUT o ID
        const userRes = await pool.query(
            `SELECT nombre_completo, nombre_vendedor, alias FROM usuario 
             WHERE rut = $1 OR id::text = $1 LIMIT 1`,
            [vId]
        );
        
        const userName = userRes.rows[0]?.nombre_completo || userRes.rows[0]?.nombre_vendedor;
        const userAlias = userRes.rows[0]?.alias;

        // Paso 2: Buscar el ID de usuario_alias usando el nombre o alias
        const aliasRes = await pool.query(
            `SELECT id FROM usuario_alias 
             WHERE UPPER(TRIM(nombre_vendedor_oficial)) = UPPER(TRIM($1))
                OR UPPER(TRIM(alias)) = UPPER(TRIM($2))
             LIMIT 1`,
            [userName || '', userAlias || '']
        );
        
        const uaId = aliasRes.rows[0]?.id || null;
        const finalComentario = `[${status.toUpperCase()}] ${comentario}`;

        await pool.query(
            `INSERT INTO cliente_actividad (cliente_rut, usuario_alias_id, comentario, activity_type_id, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [cliente_rut, uaId, finalComentario, activity_type_id]
        );
    } catch (err) {
        console.error('⚠️ Error en syncToClientActivity:', err.message);
    }
}

// Helper: Obtener clientes con Nota Cliente (HeatScore) calculada en 4 dimensiones
async function getClientsWithHeatscore(vendedorId) {
    try {
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
                c.id, c.rut, c.nombre, c.latitud, c.longitud, c.direccion, c.comuna, c.ciudad, c.circuito, c.fecha_ultima_visita, c.frecuencia_visita,
                COALESCE(cd.deuda_total, 0) as deuda_total,
                COALESCE(cd.max_dias_mora, 0) as dias_mora,
                COALESCE(cs.prom_ventas, 0) as prom_ventas,
                COALESCE(cs.meses_con_venta, 0) as meses_con_venta
            FROM cliente c
            LEFT JOIN client_sales cs ON c.rut = cs.rut
            LEFT JOIN client_debt cd ON c.rut = cd.rut
            LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
            WHERE ($1::text IS NULL OR $1 = '' OR u.rut = $1) AND c.es_terreno = true
        )
        SELECT * FROM stats
    `;
        const result = await pool.query(query, [vendedorId]);

        return result.rows.map(c => {
            const lastVisitDate = c.fecha_ultima_visita ? new Date(c.fecha_ultima_visita) : null;
            const daysSinceVisit = lastVisitDate
                ? Math.floor((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24))
                : 999;

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

            const rawScore = (notaVolumen + notaPeriodicidad + notaSaldo + notaVisita) / 4;
            const heatScore = ((rawScore - 4) / 6) * 100;

            return {
                ...c,
                heatScore: Math.round(heatScore), // 0 a 100
                rawScore, // 4 a 10
                daysSinceVisit
            };
        });
    } catch (err) {
        console.error('❌ Error in getClientsWithHeatscore:', err);
        throw err;
    }
}

// GET /api/visits/hot-circuits - Obtener ranking de circuitos por urgencia de visita
router.get('/hot-circuits', auth(), async (req, res) => {
    try {
        const isManager = req.user.rol.toUpperCase() === 'MANAGER';
        let vendedorId = req.query.vendedor_id;
        if (!isManager) vendedorId = req.user.rut;

        const allScoredClients = await getClientsWithHeatscore(vendedorId);

        // Agrupar por circuito y promediar HeatScore
        const circuitStats = {};
        allScoredClients.forEach(c => {
            const circ = c.circuito || 'SIN CIRCUITO';
            if (!circuitStats[circ]) {
                circuitStats[circ] = { nombre: circ, totalScore: 0, count: 0, criticalCount: 0 };
            }
            circuitStats[circ].totalScore += c.heatScore;
            circuitStats[circ].count += 1;
            if (c.heatScore >= 70) circuitStats[circ].criticalCount += 1;
        });

        const ranking = Object.values(circuitStats)
            .map(s => ({
                ...s,
                avgScore: Math.round(s.totalScore / s.count)
            }))
            .sort((a, b) => b.avgScore - a.avgScore);

        res.json(ranking);
    } catch (err) {
        console.error('Error hot-circuits:', err.message);
        res.status(500).send('Server Error hot-circuits');
    }
});

// GET /api/visits/heatmap - Datos para el mapa de calor
router.get('/heatmap', auth(), async (req, res) => {
    try {
        const isManager = req.user.rol.toUpperCase() === 'MANAGER';
        let vendedorId = req.query.vendedor_id;

        // Si no es manager, forzamos su propio RUT
        if (!isManager) {
            vendedorId = req.user.rut;
        }

        // Si es manager y no envía vendedor_id, pasamos NULL para traer TODOS
        const allScoredClients = await getClientsWithHeatscore(vendedorId);

        // El mapa solo puede pintar los que tienen latitud válida
        const mapData = allScoredClients.filter(c => c.latitud !== null && c.longitud !== null);

        res.json(mapData);
    } catch (err) {
        console.error('❌ Error heatmap route:', err);
        res.status(500).json({ msg: 'Server Error heatmap', error: err.message });
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

// POST /api/visits/check-in - Registrar inicio de visita con reporte de discrepancia
router.post('/check-in', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut; // Usamos RUT para consistencia
        const { cliente_rut, latitud, longitud, activity_type = 'VISITA' } = req.body;

        // 0. AUTO-CIERRE FALLBACK: Cerrar visitas > 120 mins del usuario preventivamente
        try {
            const autoCloseQuery = `
                UPDATE visitas_registro 
                SET hora_fin = CURRENT_TIME, 
                    estado = 'completada', 
                    resultado = 'Auto-cierre', 
                    notas = 'Cerrado automáticamente (Fallback > 120min).'
                WHERE (vendedor_id::text = $1 OR vendedor_id::text = $2) 
                  AND estado = 'en_progreso'
                  AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - (fecha + hora_inicio))) / 60 >= 120
            `;
            await pool.query(autoCloseQuery, [vendedorId, req.user.id]);
        } catch (autoErr) {
            console.error('⚠️ Error auto-cierre fallback:', autoErr.message);
        }

        // 1. Verificar si ya tiene una visita activa
        const activeCheck = await pool.query(
            'SELECT id FROM visitas_registro WHERE (vendedor_id::text = $1 OR vendedor_id::text = $2) AND estado = \'en_progreso\'',
            [vendedorId, req.user.id]
        );

        if (activeCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                msg: 'Ya tienes una visita en progreso. Debes finalizarla antes de iniciar otra.',
                visita_id: activeCheck.rows[0].id
            });
        }

        // 2. Obtener ID del tipo de actividad
        const typeResult = await pool.query('SELECT id FROM activity_types WHERE nombre = $1', [activity_type]);
        const activityTypeId = typeResult.rows[0]?.id;

        // 3. Obtener coordenadas del cliente para validar
        const clienteQuery = 'SELECT latitud, longitud, es_terreno FROM cliente WHERE rut = $1';
        const clienteRes = await pool.query(clienteQuery, [cliente_rut]);

        let distancia = null;
        let warning = null;

        if (clienteRes.rows.length > 0) {
            const c = clienteRes.rows[0];
            
            // Si el cliente no tiene coordenadas o no es de terreno, y recibimos coords válidas, actualizamos
            const hasCoords = c.latitud !== null && c.longitud !== null && parseFloat(c.latitud) !== 0;
            const validIncoming = latitud !== 0 && longitud !== 0;

            if ((!hasCoords || c.es_terreno === false) && validIncoming) {
                try {
                    await pool.query(
                        'UPDATE cliente SET latitud = $1, longitud = $2, es_terreno = true WHERE rut = $3',
                        [latitud, longitud, cliente_rut]
                    );
                    console.log(`📍 [Check-in] Georeferenciación automática para: ${cliente_rut}`);
                } catch (updateErr) {
                    console.error('⚠️ Error en georeferenciación automática:', updateErr.message);
                }
            }

            distancia = getDistanceFromLatLonInM(latitud, longitud, parseFloat(c.latitud || latitud), parseFloat(c.longitud || longitud));

            // Validar Geocerca (ej: 200 metros) si ya tenía coordenadas previas
            if (hasCoords && distancia && distancia > 200) {
                warning = `Estás a ${Math.round(distancia)}m del cliente. ¿Seguro que estás en el local?`;
            }
        }

        const query = `
            INSERT INTO visitas_registro (vendedor_id, cliente_rut, fecha, hora_inicio, latitud_inicio, longitud_inicio, estado, distancia_checkin, activity_type_id)
            VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3, $4, 'en_progreso', $5, $6)
            RETURNING *
        `;

        let result;
        try {
            result = await pool.query(query, [vendedorId, cliente_rut, latitud, longitud, distancia, activityTypeId]);
        } catch (dbErr) {
            // Si falla por tipo (vendedor_id es INTEGER y enviamos RUT), intentamos con ID numérico
            if (dbErr.code === '22P02' || dbErr.message.includes('invalid input syntax for type integer')) {
                console.log('🔄 Fallback: vendedor_id es INTEGER, usando req.user.id en lugar de RUT');
                result = await pool.query(query, [req.user.id, cliente_rut, latitud, longitud, distancia, activityTypeId]);
            } else {
                throw dbErr;
            }
        }

        const responseData = {
            ...result.rows[0],
            warning // Enviar warning al frontend si existe
        };

        // 4. Iniciar monitoreo automático (Bull Queue)
        try {
            await enqueueVisitMonitor({
                visita_id: responseData.id,
                cliente_rut: responseData.cliente_rut,
                user_id: req.user.id
            });
            console.log(`🚀 [Monitor] Encolado monitoreo para visita: ${responseData.id}`);
        } catch (queueErr) {
            console.error('⚠️ Error al encolar monitoreo de visita:', queueErr.message);
        }

        // Unificación: Registrar inicio de visita
        await syncToClientActivity(pool, {
            cliente_rut,
            vendedor_id: vendedorId,
            comentario: `Inicia visita en terreno.`,
            activity_type_id: activityTypeId || 391,
            status: 'check-in'
        });

        res.status(201).json(responseData);
    } catch (err) {
        console.error('Error check-in:', err.message);
        res.status(500).json({ msg: 'Server Error check-in' });
    }
});

// GET /api/visits/suggestions - Obtener sugerencias para planificación
router.get('/suggestions', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut; // Usamos RUT

        // 1. Obtener todos los clientes del vendedor con su Score de Calor (Nota Cliente)
        const allScoredClients = await getClientsWithHeatscore(vendedorId);

        if (!allScoredClients || allScoredClients.length === 0) {
            return res.json([]);
        }

        // 2. Obtener visitas de hoy para filtrar
        const visitsQuery = `
            SELECT cliente_rut FROM visitas_registro 
            WHERE fecha = CURRENT_DATE AND (vendedor_id::text = $1)
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

// POST /api/visits/plan - Guardar planificación para una fecha (hoy o futura)
router.post('/plan', auth(), async (req, res) => {
    try {
        const vendedorIdNum = req.user.id; // visitas_registro usa INTEGER
        const vendedorIdRut = req.user.rut;
        const { clientes, fecha, activity_type_id, goal_type_id, comentario_plan } = req.body; 

        if (!clientes || !Array.isArray(clientes)) {
            return res.status(400).json({ msg: 'Lista de clientes inválida' });
        }

        const fechaTarget = fecha || null;

        // Intentar obtener un activity_type_id por defecto si no viene uno válido (FUERA de la transacción)
        let defaultActId = 391;
        try {
            const actRes = await pool.query("SELECT id FROM activity_types WHERE nombre ILIKE '%Visita%' LIMIT 1");
            if (actRes.rows.length > 0) defaultActId = actRes.rows[0].id;
        } catch (e) { 
            console.warn('⚠️ No se pudo obtener defaultActId de activity_types:', e.message); 
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let insertCount = 0;
            for (const c of clientes) {
                const rut = typeof c === 'string' ? c : c.rut;
                const act_id = typeof c === 'string' ? (activity_type_id || defaultActId) : (c.activity_type_id || activity_type_id || defaultActId);
                const goal_id = typeof c === 'string' ? (goal_type_id || 15) : (c.goal_type_id || goal_type_id || 15);
                const comment = typeof c === 'string' ? (comentario_plan || '') : (c.comentario_plan || comentario_plan || '');

                if (!rut) continue;

                const checkParams = fechaTarget
                    ? [vendedorIdRut, vendedorIdNum, rut, fechaTarget]
                    : [vendedorIdRut, vendedorIdNum, rut];
                const checkQ = fechaTarget
                    ? `SELECT id FROM visitas_registro WHERE (vendedor_id::text = $1 OR vendedor_id::text = $2::text) AND cliente_rut = $3 AND fecha::date = $4::date`
                    : `SELECT id FROM visitas_registro WHERE (vendedor_id::text = $1 OR vendedor_id::text = $2::text) AND cliente_rut = $3 AND fecha::date = CURRENT_DATE`;

                const check = await client.query(checkQ, checkParams);

                if (check.rows.length === 0) {
                    if (req.user.rol && req.user.rol.toLowerCase() === 'manager') {
                        // Manager can plan for specific dates
                        const insertQ = `INSERT INTO visitas_registro (vendedor_id, cliente_rut, fecha, estado, planificada, prioridad_sugerida, activity_type_id, goal_type_id, comentario_plan)
                               VALUES ((SELECT id FROM usuario WHERE rut = $1 LIMIT 1), $2, $3, 'pendiente', TRUE, 1, $4, $5, $6)`;
                        const managerParams = [vendedorIdRut, rut, fechaTarget, activity_type_id || 391, goal_type_id || 15, comentario_plan || ''];
                        await client.query(insertQ, managerParams);
                        insertCount++;
                    } else {
                        // Seller plans
                        const insertQ = `INSERT INTO visitas_registro (vendedor_id, cliente_rut, fecha, estado, planificada, prioridad_sugerida, activity_type_id, goal_type_id, comentario_plan)
                               VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), 'pendiente', TRUE, 1, $4, $5, $6)`;
                        const insertParams = [vendedorIdNum, rut, fechaTarget, act_id, goal_id, comment];
                        await client.query(insertQ, insertParams);

                        // Unificación: Registrar planificación en el historial solo si hay cliente
                        if (rut) {
                            await syncToClientActivity(client, {
                                cliente_rut: rut,
                                vendedor_id: (req.user.rol && req.user.rol.toLowerCase() === 'manager') ? vendedorIdRut : req.user.rut,
                                comentario: `Planificada para ${fechaTarget || 'hoy'}. ${comment}`,
                                activity_type_id: act_id,
                                status: 'planificada'
                            });
                        }
                        
                        insertCount++;
                    }
                }
            }

            await client.query('COMMIT');
            res.json({ msg: 'Plan guardado correctamente', count: insertCount });
        } catch (err) {
            await client.query('ROLLBACK');
            res.status(500).json({ msg: 'Error al planificar', error: err.message });
        } finally {
            client.release();
        }

    } catch (err) {
        res.status(500).send('Server Error planning');
    }
});

// GET /api/visits/by-date?fecha=YYYY-MM-DD - Obtener visitas y eventos planificados
router.get('/by-date', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut || '';
        const userId = req.user.id;
        const { fecha } = req.query;

        if (!fecha) return res.status(400).json({ msg: 'Parámetro fecha requerido' });

        // Normalización para búsqueda cruzada
        const rutClean = vendedorId.replace(/[^a-zA-Z0-9]/g, '');

        const query = `
            SELECT v.*, 
                   c.nombre as cliente_nombre, 
                   c.direccion as cliente_direccion, 
                   c.circuito,
                   COALESCE(v.tipo_evento, 'ruta') as tipo_evento,
                   COALESCE(v.titulo, 'Visita a Cliente') as titulo,
                   (
                     SELECT string_agg(u.nombre_vendedor, ', ')
                     FROM usuario u
                     WHERE jsonb_typeof(v.participantes) = 'array' 
                       AND u.id::text IN (
                        SELECT jsonb_array_elements_text(v.participantes)
                     )
                   ) as nombres_participantes
            FROM visitas_registro v
            LEFT JOIN cliente c ON v.cliente_rut = c.rut
            WHERE (
                (v.vendedor_id::text ~ '^[0-9]+$' AND v.vendedor_id::text = $1) -- ID numérico directo
                OR REGEXP_REPLACE(v.vendedor_id::text, '[^0-9]', '', 'g') = REGEXP_REPLACE($2, '[^0-9]', '', 'g') -- RUT numérico vs RUT numérico
                OR REGEXP_REPLACE(v.vendedor_id::text, '[^0-9]', '', 'g') = REGEXP_REPLACE($3, '[^0-9]', '', 'g') -- RUT numérico vs RUT original
            )
            AND v.fecha::date = $4::date
            ORDER BY 
                CASE WHEN v.hora_inicio_plan IS NOT NULL THEN 0 ELSE 1 END,
                v.hora_inicio_plan ASC,
                v.planificada DESC, 
                v.id ASC
        `;
        const result = await pool.query(query, [userId.toString(), rutClean, vendedorId, fecha]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error by-date:', err.message);
        res.status(500).send('Server Error by-date');
    }
});

// POST /api/visits/event - Crear un evento manual (oficina, personal, etc.)
router.post('/event', auth(), async (req, res) => {
    try {
        const vendedorIdNum = req.user.id;
        const { titulo, tipo_evento, fecha, hora_inicio_plan, hora_fin_plan, notas } = req.body;

        if (!titulo || !fecha) {
            return res.status(400).json({ msg: 'Título y fecha son requeridos' });
        }

        const query = `
            INSERT INTO visitas_registro (
                vendedor_id, titulo, tipo_evento, fecha, 
                hora_inicio_plan, hora_fin_plan, notas, 
                estado, planificada
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', TRUE)
            RETURNING *
        `;
        const params = [
            vendedorIdNum, 
            titulo, 
            tipo_evento || 'oficina', 
            fecha,
            (hora_inicio_plan && hora_inicio_plan !== '') ? hora_inicio_plan : null,
            (hora_fin_plan && hora_fin_plan !== '') ? hora_fin_plan : null,
            notas || ''
        ];

        const result = await pool.query(query, params);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating event:', err.message);
        res.status(500).send('Server Error creating event');
    }
});

// POST /api/visits/group-event - Crear un evento para múltiples usuarios (Solo Manager)
router.post('/group-event', auth(), async (req, res) => {
    if (!req.user.rol || req.user.rol.toLowerCase() !== 'manager') {
        return res.status(403).json({ msg: 'No autorizado. Se requiere rol Manager.' });
    }

    const client = await pool.connect();
    try {
        const { titulo, tipo_evento, fecha, hora_inicio_plan, hora_fin_plan, notas, participantes } = req.body;

        if (!participantes || !Array.isArray(participantes) || participantes.length === 0) {
            return res.status(400).json({ msg: 'Debe seleccionar al menos un participante' });
        }

        await client.query('BEGIN');

        const insertQ = `
            INSERT INTO visitas_registro (
                vendedor_id, titulo, tipo_evento, fecha, 
                hora_inicio_plan, hora_fin_plan, notas, 
                estado, planificada, participantes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', TRUE, $8)
        `;

        for (const userId of participantes) {
            await client.query(insertQ, [
                userId, 
                titulo, 
                tipo_evento || 'reunion', 
                fecha,
                (hora_inicio_plan && hora_inicio_plan !== '') ? hora_inicio_plan : null,
                (hora_fin_plan && hora_fin_plan !== '') ? hora_fin_plan : null,
                notas,
                JSON.stringify(participantes)
            ]);
        }

        await client.query('COMMIT');
        res.json({ msg: 'Evento grupal creado correctamente', count: participantes.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error group event:', err.message);
        res.status(500).send('Server Error group event');
    } finally {
        client.release();
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

        const visita = result.rows[0];

        // 1. ACTUALIZACIÓN AUTOMÁTICA EN TABLA CLIENTE (solo si hay cliente)
        if (visita.cliente_rut) {
            try {
                await pool.query(
                    'UPDATE cliente SET fecha_ultima_visita = CURRENT_DATE WHERE rut = $1',
                    [visita.cliente_rut]
                );
                console.log(`✅ [Check-out] fecha_ultima_visita actualizada para: ${visita.cliente_rut}`);
            } catch (updateErr) {
                console.error('⚠️ Error al actualizar fecha_ultima_visita en cliente:', updateErr.message);
            }

            // 2. INTEGRACIÓN UNIFICADA CON HISTORIAL (cliente_actividad)
            const comentarioDetallado = `${resultado || 'Visita finalizada'}${notas ? '. Notas: ' + notas : ''}`;
            await syncToClientActivity(pool, {
                cliente_rut: visita.cliente_rut,
                vendedor_id: req.user.rut,
                comentario: comentarioDetallado,
                activity_type_id: visita.activity_type_id || 391,
                status: 'completada'
            });
        }

        res.json(visita);
    } catch (err) {
        console.error('Error check-out:', err.message);
        res.status(500).json({ msg: 'Server Error check-out' });
    }
});

// GET /api/visits/supervision - Resumen detallado para dashboard de Manager
router.get('/supervision', auth(), async (req, res) => {
    if (!req.user.rol || req.user.rol.toLowerCase() !== 'manager') {
        return res.status(403).json({ msg: 'Acceso restringido a Managers' });
    }

    try {
        const { fecha } = req.query;
        if (!fecha) return res.status(400).json({ msg: 'Fecha es requerida' });

        const query = `
            SELECT 
                main.id as vendedor_id,
                main.nombre_vendedor as nombre,
                main.rut,
                COALESCE(stats.total_actividades, 0) as total_actividades,
                COALESCE(stats.planificadas, 0) as planificadas,
                COALESCE(stats.completadas, 0) as completadas,
                COALESCE(stats.en_progreso, 0) as en_progreso,
                stats.primera_visita,
                stats.ultima_visita,
                COALESCE(stats.fuera_geocerca, 0) as fuera_geocerca
            FROM (
                SELECT DISTINCT ON (rut) *
                FROM usuario
                WHERE nombre_vendedor IS NOT NULL
                  AND (rol_usuario ILIKE 'vendedor' OR rol_usuario ILIKE 'manager')
                  AND rut NOT ILIKE 'stub-%'
                  AND (alias IS NULL OR alias NOT ILIKE '%_OLD')
                  AND nombre_vendedor NOT ILIKE '%admin%'
            ) main
            LEFT JOIN (
                SELECT 
                    v.vendedor_id,
                    COUNT(v.id) as total_actividades,
                    COUNT(CASE WHEN v.planificada = TRUE THEN 1 END) as planificadas,
                    COUNT(CASE WHEN v.estado = 'completada' THEN 1 END) as completadas,
                    COUNT(CASE WHEN v.estado = 'en_progreso' THEN 1 END) as en_progreso,
                    MIN(v.hora_inicio) as primera_visita,
                    MAX(v.hora_fin) as ultima_visita,
                    COUNT(CASE WHEN v.distancia_checkin > 500 THEN 1 END) as fuera_geocerca
                FROM visitas_registro v
                WHERE v.fecha::date = $1::date
                GROUP BY v.vendedor_id
            ) stats ON (
                main.id::text = stats.vendedor_id::text 
                OR REGEXP_REPLACE(main.rut, '[^0-9]', '', 'g') = REGEXP_REPLACE(stats.vendedor_id::text, '[^0-9]', '', 'g')
            )
            ORDER BY main.nombre_vendedor ASC
        `;
        const result = await pool.query(query, [fecha]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en supervision:', err);
        res.status(500).json({ 
            msg: 'Error interno en el reporte de supervisión',
            error: err.message 
        });
    }
});
// GET /api/visits/supervision/:vendedor_id - Detalle de la jornada de un vendedor
router.get('/supervision/:vendedor_id', auth(), async (req, res) => {
    if (!req.user.rol || req.user.rol.toLowerCase() !== 'manager') {
        return res.status(403).json({ msg: 'Acceso restringido' });
    }

    try {
        const { vendedor_id } = req.params;
        const { fecha } = req.query;

        const query = `
            SELECT v.*, c.nombre as cliente_nombre, c.direccion as cliente_direccion
            FROM visitas_registro v
            LEFT JOIN cliente c ON v.cliente_rut = c.rut
            WHERE (v.vendedor_id::text = $1 OR v.vendedor_id::text = (SELECT rut FROM usuario WHERE id::text = $1 LIMIT 1))
            AND v.fecha::date = $2::date
            ORDER BY v.hora_inicio ASC NULLS LAST, v.id ASC
        `;
        const result = await pool.query(query, [vendedor_id, fecha]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en detalle supervision:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/visits/active - Obtener visita en curso
router.get('/active', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut || '';
        const vendedorIdNum = req.user.id;

        // 0. AUTO-CIERRE FALLBACK: Cerrar visitas > 120 mins
        try {
            const autoCloseQuery = `
                UPDATE visitas_registro 
                SET hora_fin = CURRENT_TIME, 
                    estado = 'completada', 
                    resultado = 'Auto-cierre', 
                    notas = 'Cerrado automáticamente (Fallback > 120min).'
                WHERE (vendedor_id::text = $1 OR vendedor_id::text = $2) 
                  AND estado = 'en_progreso'
                  AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - (fecha + hora_inicio))) / 60 >= 120
            `;
            await pool.query(autoCloseQuery, [vendedorId, vendedorIdNum]);
        } catch (autoErr) { console.error('⚠️ Error auto-cierre fallback:', autoErr.message); }

        const query = `
            SELECT v.*, c.nombre as cliente_nombre, c.direccion as cliente_direccion
            FROM visitas_registro v
            LEFT JOIN cliente c ON v.cliente_rut = c.rut
            WHERE (v.vendedor_id::text = $1 OR v.vendedor_id::text = $2)
            AND v.estado = 'en_progreso'
            LIMIT 1
        `;
        const result = await pool.query(query, [vendedorId, vendedorIdNum]);
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error('Error fetching active visit:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/visits/workload - Obtener carga de visitas por día para un rango de fechas
router.get('/workload', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut;
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ msg: 'Parámetros start_date y end_date requeridos (YYYY-MM-DD)' });
        }

        const query = `
            SELECT fecha::text, COUNT(*) as count
            FROM visitas_registro
            WHERE (vendedor_id::text = $1 OR vendedor_id::text = $2)
            AND fecha BETWEEN $3::date AND $4::date
            GROUP BY fecha
            ORDER BY fecha ASC
        `;
        const result = await pool.query(query, [vendedorId, req.user.id.toString(), start_date, end_date]);
        
        const workload = {};
        result.rows.forEach(row => {
            workload[row.fecha] = parseInt(row.count);
        });

        res.json(workload);
    } catch (err) {
        console.error('Error workload:', err.message);
        res.status(500).send('Server Error workload');
    }
});

// GET /api/visits/my-today - Obtener visitas del día actual para el vendedor
router.get('/my-today', auth(), async (req, res) => {
    try {
        const vendedorId = req.user.rut; // Usamos RUT
        const query = `
            SELECT v.*, c.nombre as cliente_nombre, c.direccion as cliente_direccion,
                   at.nombre as accion_nombre, gt.nombre as objetivo_nombre
            FROM visitas_registro v
            JOIN cliente c ON v.cliente_rut = c.rut
            LEFT JOIN activity_types at ON v.activity_type_id = at.id
            LEFT JOIN goal_types gt ON v.goal_type_id = gt.id
            WHERE (v.vendedor_id::text = $1 OR v.vendedor_id::text = $2) 
            AND (v.fecha <= CURRENT_DATE AND v.estado = 'pendiente' OR v.fecha = CURRENT_DATE)
            ORDER BY 
                CASE WHEN v.estado = 'en_progreso' THEN 0
                     WHEN v.estado = 'pendiente' THEN 1
                     ELSE 2 END,
                v.fecha ASC,
                v.planificada DESC, 
                v.id ASC
        `;
        const result = await pool.query(query, [vendedorId, req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error my-today:', err.message);
        res.status(500).send('Server Error my-today');
    }
});

// DELETE /api/visits/:id - Eliminar una visita planificada
router.delete('/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        const vendedorId = req.user.rut;

        // Solo permitir eliminar si es el vendedor dueño o manager
        // Además, solo si está pendiente (opcional, pero recomendado)
        const query = `
            DELETE FROM visitas_registro 
            WHERE id = $1 AND (vendedor_id::text = $2 OR vendedor_id::text = $3)
            RETURNING *
        `;
        const result = await pool.query(query, [id, vendedorId, req.user.id.toString()]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Visita no encontrada o sin permisos' });
        }

        res.json({ msg: 'Visita eliminada correctamente', visita: result.rows[0] });
    } catch (err) {
        console.error('Error deleting visit:', err.message);
        res.status(500).send('Server Error deleting visit');
    }
});

module.exports = router;
