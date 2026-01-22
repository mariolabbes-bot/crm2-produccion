const cron = require('node-cron');
const { runAutoImport } = require('./automatedImportService');

const initCronJobs = () => {
    console.log('⏰ [Cron] Inicializando tareas programadas...');

    // Programar importación diaria a las 21:00 (9 PM)
    cron.schedule('0 21 * * *', async () => {
        console.log('⏰ [Cron] Ejecutando Importación Automática diaria (21:00)...');
        try {
            await runAutoImport();
        } catch (error) {
            console.error('❌ [Cron] Error fatal en AutoImport:', error);
        }
    });

    console.log('⏰ [Cron] Tareas programadas correctamente: AutoImport @ 21:00');
};

module.exports = { initCronJobs };
