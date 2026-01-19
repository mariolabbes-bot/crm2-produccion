const Queue = require('bull');
const Redis = require('ioredis');
const { processVentasFileAsync, processAbonosFileAsync, processClientesFileAsync, processSaldoCreditoFileAsync, updateJobStatus } = require('../services/importJobs');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://localhost:6379';
// if (!REDIS_URL) {
//     throw new Error('REDIS_URL is required for importBullWorker');
// }
console.log(`🔌 [ImportWorker] Usando Redis en: ${REDIS_URL}`);

// Configuración robusta de Redis para Producción (Render)
const redisConfig = {
    redis: {
        port: 6379,
        host: 'localhost',
        // Opciones adicionales para prods
    }
};

if (REDIS_URL) {
    const url = new URL(REDIS_URL);
    redisConfig.redis = {
        port: url.port,
        host: url.hostname,
        password: url.password,
        username: url.username,
        tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null, // Importante: Requerido por Bull
        enableReadyCheck: false
    };
    if (REDIS_URL.startsWith('rediss://')) {
        console.log('🔒 [ImportWorker] Usando conexión segura (TLS) para Redis');
    }
}

// Configuración fallback para local (si no hay REDIS_URL) se asegura de tener opciones básicas si es necesario
const queueConfig = REDIS_URL
    ? { redis: redisConfig.redis }
    : { redis: { port: 6379, host: 'localhost', maxRetriesPerRequest: null } };

const importQueue = new Queue('import-jobs', queueConfig);

importQueue.process(async (job) => {
    const { jobId, type, filePath, originalName, userRut, options } = job.data;

    console.log(`👷 [Worker] Procesando job ${jobId} tipo ${type}`);

    try {
        if (type === 'ventas') {
            await processVentasFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'abonos') {
            await processAbonosFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'clientes') {
            await processClientesFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'saldo_credito') {
            await processSaldoCreditoFileAsync(jobId, filePath, originalName, options);
        } else {
            throw new Error(`Tipo de importación desconocido: ${type}`);
        }

        return Promise.resolve();
    } catch (err) {
        console.error(`❌ [Worker] Error en job ${jobId}:`, err);
        await updateJobStatus(jobId, 'failed', { errorMessage: err.message });
        throw err;
    }
});

const enqueueImport = async (jobData) => {
    // jobData: { jobId, type, filePath, originalName, userRut }
    return await importQueue.add(jobData, {
        removeOnComplete: true,
        attempts: 1 // No reintentar automáticamente por ahora para evitar corrupción si es error lógico
    });
};

module.exports = { importQueue, enqueueImport };
