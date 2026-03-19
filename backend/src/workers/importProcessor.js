const { processVentasFileAsync, processAbonosFileAsync, processClientesFileAsync, processSaldoCreditoFileAsync, updateJobStatus } = require('../services/importJobs');
const { validateIntegrity } = require('../../scripts/validate_import_integrity');
const { sendWhatsApp } = require('../providers/twilioProvider');
const { createNotification } = require('../services/notificationService');

/**
 * Sandboxed Process Function
 */
module.exports = async function (job) {
    const { jobId, type, filePath, originalName, userRut, options } = job.data;

    console.log(`👷 [Sandboxed Worker] Procesando job ${jobId} tipo ${type} (PID: ${process.pid})`);

    try {
        // 1. EXECUTE IMPORT
        if (type === 'ventas') {
            await processVentasFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'abonos') {
            await processAbonosFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'clientes') {
            await processClientesFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'saldo_credito') {
            await processSaldoCreditoFileAsync(jobId, filePath, originalName, options);
        } else if (type === 'stock') {
            const { processStockFileAsync } = require('../services/importJobs');
            await processStockFileAsync(jobId, filePath, originalName);
        } else {
            throw new Error(`Tipo de importación desconocido: ${type}`);
        }

        // 2. RUN VALIDATION (Only for financial data: ventas, abonos)
        if (type === 'ventas' || type === 'abonos') {
            console.log(`🔍 [Job ${jobId}] Ejecutando validación cruzada...`);
            const valResult = await validateIntegrity(filePath, type);

            if (valResult.success) {
                // 3. SEND NOTIFICATION (Internal & WhatsApp)
                const icon = valResult.integrity ? '✅' : '❌';
                const summary = `Importación ${type.toUpperCase()}: $${valResult.excelTotal.toLocaleString('es-CL')} (Excel) vs $${valResult.dbTotal.toLocaleString('es-CL')} (BD). Dif: $${valResult.diffTotal.toLocaleString('es-CL')}`;

                // A. Internal Notification
                await createNotification({
                    userRole: 'admin',
                    type: valResult.integrity ? 'success' : 'warning',
                    title: `Importación ${type} Finalizada`,
                    message: summary + (valResult.integrity ? '' : ' - Revisar discrepancias.')
                });

                // B. WhatsApp Notification (Optional)
                const adminPhone = process.env.ADMIN_PHONE;
                if (adminPhone) {
                    const msg = `🤖 *Reporte de Importación CRM*\n\n` +
                        `📁 Archivo: ${originalName}\n` +
                        `📊 Tipo: ${type.toUpperCase()}\n` +
                        `📅 Periodo: ${valResult.dateRange}\n\n` +
                        `*Validación Cruzada:*\n` +
                        `• Excel: $${valResult.excelTotal.toLocaleString('es-CL')}\n` +
                        `• BD: $${valResult.dbTotal.toLocaleString('es-CL')}\n` +
                        `• Diferencia: $${valResult.diffTotal.toLocaleString('es-CL')} ${icon}\n\n` +
                        (valResult.integrity ? `Integridad Verificada Correctamente.` : `⚠️ *ATENCIÓN:* Hay diferencias significativas.`);

                    await sendWhatsApp({ to: adminPhone, body: msg });
                }
            }
        }

        return Promise.resolve({ success: true });
    } catch (err) {
        console.error(`❌ [Sandboxed Worker] Error en job ${jobId}:`, err);
        await updateJobStatus(jobId, 'failed', { errorMessage: err.message });
        throw err;
    }
};
