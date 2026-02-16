const Queue = require('bull');
const Redis = require('ioredis');
const { processVentasFileAsync, processAbonosFileAsync, processClientesFileAsync, processSaldoCreditoFileAsync, updateJobStatus } = require('../services/importJobs');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://localhost:6379';
// if (!REDIS_URL) {
//     throw new Error('REDIS_URL is required for importBullWorker');
// }
console.log(`🔌 [ImportWorker] Usando Redis en: ${REDIS_URL}`);

// Configuración robusta de Redis para Producción (Render)
// Configuración robusta de Redis para Producción (Render) y Desarrollo
const getRedisConfig = () => {
    if (REDIS_URL) {
        const url = new URL(REDIS_URL);
        const isTls = REDIS_URL.startsWith('rediss://');
        
        return {
            redis: {
                port: url.port,
                host: url.hostname,
                password: url.password,
                username: url.username,
                tls: isTls ? { rejectUnauthorized: false } : undefined,
                maxRetriesPerRequest: null,
                enableReadyCheck: false
            }
        };
    }
    
    // Fallback local
    return { 
        redis: { 
            port: 6379, 
            host: 'localhost', 
            maxRetriesPerRequest: null 
        } 
    };
};

const queueConfig = getRedisConfig();

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
