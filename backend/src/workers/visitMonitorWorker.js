const Queue = require('bull');
const pool = require('../db');
const { createNotification } = require('../services/notificationService');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://localhost:6379';
console.log(`🔌 [VisitMonitorWorker] Usando Redis en: ${REDIS_URL}`);

// Cola para monitoreo de visitas
const visitMonitorQueue = new Queue('visit-monitor', REDIS_URL, {
    redis: {
        tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        family: 0
    }
});

/**
 * Procesa el monitoreo de una visita
 * job.data: { visita_id, cliente_rut, user_id, start_time }
 */
visitMonitorQueue.process(async (job) => {
    const { visita_id, cliente_rut, user_id } = job.data;

    try {
        // 1. Verificar si la visita sigue 'en_progreso'
        const res = await pool.query('SELECT estado, hora_inicio FROM visitas_registro WHERE id = $1', [visita_id]);
        if (res.rows.length === 0 || res.rows[0].estado !== 'en_progreso') {
            return { status: 'completed_or_invalid', visita_id };
        }

        const visita = res.rows[0];
        const now = new Date();
        const startTime = new Date(`${now.toISOString().split('T')[0]}T${visita.hora_inicio}`);
        const diffMinutes = Math.floor((now - startTime) / 60000);

        // 2. Lógica de notificaciones según duración
        if (diffMinutes >= 120) {
            // AUTO-CIERRE
            await pool.query(
                `UPDATE visitas_registro 
                 SET hora_fin = CURRENT_TIME, 
                     estado = 'completada', 
                     resultado = 'Auto-cierre (Exceso de tiempo)', 
                     notas = 'Cerrado automáticamente por el sistema tras 120 minutos.'
                 WHERE id = $1`,
                [visita_id]
            );

            await createNotification({
                userRole: 'seller', // Enviar al vendedor (necesitaríamos mapeo de rol si es dinámico)
                type: 'warning',
                title: '📍 Visita Cerrada Automáticamente',
                message: `La visita al cliente ${cliente_rut} ha superado los 120 minutos y se ha cerrado automáticamente.`
            });

            return { status: 'auto_closed', visita_id };
        } else if (diffMinutes >= 60) {
            // RECORDATORIO
            await createNotification({
                userRole: 'seller',
                type: 'info',
                title: '⏳ Recordatorio de Visita',
                message: `Llevas más de 60 minutos en la visita al cliente ${cliente_rut}. No olvides realizar el Check-out.`
            });

            return { status: 'reminder_sent', visita_id };
        }

        return { status: 'active', minutes: diffMinutes };
    } catch (err) {
        console.error('❌ Error en VisitMonitorWorker:', err.message);
        throw err;
    }
});

/**
 * Encola un monitoreo para una visita recién iniciada
 */
const enqueueVisitMonitor = async (visitaData) => {
    // Programar primer chequeo a los 61 minutos
    await visitMonitorQueue.add(visitaData, {
        delay: 61 * 60 * 1000,
        removeOnComplete: true
    });

    // Programar segundo chequeo (auto-cierre) a los 121 minutos
    await visitMonitorQueue.add(visitaData, {
        delay: 121 * 60 * 1000,
        removeOnComplete: true
    });
};

module.exports = { visitMonitorQueue, enqueueVisitMonitor };
