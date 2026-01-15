const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Entrypoint para ejecutar el worker en producción.
 * Ejecutar: NODE_ENV=production REDIS_URL=... node src/worker.js
 */
try {
  const { assistantQueue } = require('./workers/assistantBullWorker');
  const { importQueue } = require('./workers/importBullWorker');

  assistantQueue.on('ready', () => {
    console.log('assistantBullWorker: queue ready and processing jobs');
  });

  assistantQueue.on('error', (err) => {
    console.error('assistantBullWorker: queue error', err);
  });

  importQueue.on('ready', () => {
    console.log('importBullWorker: queue ready and processing jobs');
  });

  importQueue.on('error', (err) => {
    console.error('importBullWorker: queue error', err);
  });

  // Keep process alive while Bull handles jobs
  const shutdown = async (signal) => {
    console.log(`${signal} received, closing queues...`);
    try {
      await Promise.all([
        assistantQueue.close(),
        importQueue.close()
      ]);
    } catch (e) { console.error(e); }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

} catch (err) {
  console.error('Failed to start workers:', err.message || err);
  process.exit(1);
}
