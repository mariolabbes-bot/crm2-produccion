const cron = require('node-cron');
const { runAutoImport } = require('./automatedImportService');

const initCronJobs = () => {
    console.log('⏰ [Cron] Inicializando tareas programadas...');

    // Programar importación diaria a las 23:00 (11 PM) Lunes a Sábado
    cron.schedule('0 23 * * 1-6', async () => {
        console.log('⏰ [Cron] Ejecutando Importación Automática diaria (23:00 L-V)...');
        try {
            await runAutoImport();
        } catch (error) {
            console.error('❌ [Cron] Error fatal en AutoImport:', error);
        }
    });

    console.log('⏰ [Cron] Tareas programadas correctamente: AutoImport @ 23:00 L-V');
};

module.exports = { initCronJobs };
