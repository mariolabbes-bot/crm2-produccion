const Queue = require('bull');
const Redis = require('ioredis');
// const { processVentasFileAsync, ... } = require('../services/importJobs'); // Moved to importProcessor.js

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

const path = require('path');

// ... (Queue initialization remains the same)

// USE SANDBOXED PROCESSOR: Prevents Main Thread Blocking
// This spawns a child process for each job (or reuses them).
importQueue.process(path.join(__dirname, 'importProcessor.js'));

const enqueueImport = async (jobData) => {
    // jobData: { jobId, type, filePath, originalName, userRut }
    return await importQueue.add(jobData, {
        removeOnComplete: true,
        attempts: 1 // No reintentar automáticamente por ahora para evitar corrupción si es error lógico
    });
};

module.exports = { importQueue, enqueueImport };
