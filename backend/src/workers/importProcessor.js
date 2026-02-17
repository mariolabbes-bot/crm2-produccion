const { processVentasFileAsync, processAbonosFileAsync, processClientesFileAsync, processSaldoCreditoFileAsync, updateJobStatus } = require('../services/importJobs');

/**
 * Sandboxed Process Function
 * Bull will spawn a child process to run this function.
 * This prevents the Main Event Loop (Express) from blocking during CPU-intensive tasks like XLSX.readFile.
 */
module.exports = async function (job) {
    const { jobId, type, filePath, originalName, userRut, options } = job.data;

    console.log(`👷 [Sandboxed Worker] Procesando job ${jobId} tipo ${type} (PID: ${process.pid})`);

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

        return Promise.resolve({ success: true });
    } catch (err) {
        console.error(`❌ [Sandboxed Worker] Error en job ${jobId}:`, err);
        await updateJobStatus(jobId, 'failed', { errorMessage: err.message });
        throw err;
    }
};
