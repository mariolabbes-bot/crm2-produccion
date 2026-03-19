const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { listUnprocessedFiles, downloadFile, moveFile, ensureSubfolders } = require('./googleDriveService');
const { processClientesFileAsync } = require('./importers/clientes');
const { processVentasFileAsync } = require('./importers/ventas');
const { processAbonosFileAsync } = require('./importers/abonos');
const { processSaldoCreditoFileAsync } = require('./importers/saldo_credito');
const { processStockFileAsync } = require('./importers/stock');
const { createJob } = require('./jobManager');
const { createNotification } = require('./notificationService'); // Added Notification Service

// CONSTANTS
const DRIVE_FOLDER_ID = '1qPyGG4hYSIgdYSQimFnYiBrubOYC6U_7';
const TEMP_DIR = path.join(__dirname, '../../uploads/temp_drive');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

let isRunning = false;

async function runDriveImportCycle() {
    if (isRunning) {
        console.log('🤖 [DriveBot] Ciclo anterior en progreso. Omitiendo escaneo...');
        return;
    }
    isRunning = true;
    console.log('🤖 [DriveBot] Iniciando ciclo de escaneo en Google Drive...');

    try {
        // 1. Ensure subfolders exist (PROCESADOS, ERRORES)
        const folders = await ensureSubfolders(DRIVE_FOLDER_ID);

        // 2. List unprocessed files
        const files = await listUnprocessedFiles(DRIVE_FOLDER_ID);
        console.log(`🤖 [DriveBot] Encontrados ${files.length} archivos pendientes.`);

        // PRIORITIZE CLIENTS
        files.sort((a, b) => {
            const nameA = a.name.toUpperCase();
            const nameB = b.name.toUpperCase();
            const scoreA = nameA.includes('CLIENTE') ? 1 : 2;
            const scoreB = nameB.includes('CLIENTE') ? 1 : 2;
            return scoreA - scoreB;
        });

        if (files.length === 0) return;

        // 3. Process each file
        for (const file of files) {
            console.log(`🤖 [DriveBot] Procesando: ${file.name} (ID: ${file.id})`);

            let importer = null;
            let type = '';
            const name = file.name.toUpperCase();

            if (name.includes('CLIENTE')) { type = 'import-clientes'; importer = processClientesFileAsync; }
            else if (name.includes('VENTA')) { type = 'import-ventas'; importer = processVentasFileAsync; }
            else if (name.includes('ABONO') || name.includes('RECAUDACION')) { type = 'import-abonos'; importer = processAbonosFileAsync; }
            else if (name.includes('SALDO') && name.includes('CREDITO')) { type = 'import-saldo'; importer = processSaldoCreditoFileAsync; }
            else if (name.includes('STOCK')) { type = 'import-stock'; importer = processStockFileAsync; }

            if (!importer) {
                console.log(`⚠️ [DriveBot] Archivo ignorado (Formato desconocido): ${file.name}`);
                await createNotification({
                    userRole: 'admin',
                    type: 'warning',
                    title: `DriveBot: Archivo ignorado`,
                    message: `Archivo "${file.name}" no tiene un formato reconocido.`
                });
                if (folders.ERRORES) {
                    await moveFile(file.id, DRIVE_FOLDER_ID, folders.ERRORES);
                    console.log(`⚠️ [DriveBot] Archivo movido a ERRORES por formato desconocido: ${file.name}`);
                }
                continue;
            }

            const localPath = path.join(TEMP_DIR, file.name);
            await downloadFile(file.id, localPath);

            // createJob(type, filename, userRut)
            const jobId = await createJob(type.replace('import-', ''), file.name, 'SYSTEM_BOT');

            try {
                // Execute Import - Pass jobId, path, originalName
                // Importers expected signature: (jobId, filePath, originalName)
                const result = await importer(jobId, localPath, file.name);

                // Notification: Success
                const filas = result.imported !== undefined ? result.imported : (result.inserted !== undefined ? result.inserted + (result.updated || 0) : 0);
                await createNotification({
                    userRole: 'admin',
                    type: 'success',
                    title: `Importación Auto: ${type.split('-')[1].toUpperCase()}`,
                    message: `Archivo "${file.name}" procesado. Filas: ${filas} importadas.`
                });

                if (folders.PROCESADOS) {
                    await moveFile(file.id, DRIVE_FOLDER_ID, folders.PROCESADOS);
                    console.log(`✅ [DriveBot] Archivo movido a PROCESADOS: ${file.name}`);
                }

            } catch (error) {
                console.error(`❌ [DriveBot] Falló importación de ${file.name}:`, error.message);

                // Notification: Error
                await createNotification({
                    userRole: 'admin',
                    type: 'error',
                    title: `Error Importación Auto: ${file.name}`,
                    message: `Fallo al procesar: ${error.message}`
                });

                if (folders.ERRORES) {
                    await moveFile(file.id, DRIVE_FOLDER_ID, folders.ERRORES);
                    console.log(`❌ [DriveBot] Archivo movido a ERRORES: ${file.name}`);
                }
            } finally {
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
            }
        }
    } catch (error) {
        console.error('🔥 [DriveBot] Error Crítico en el ciclo:', error);
    } finally {
        isRunning = false;
    }
}

// Scheduler: Run every 5 minutes
function startScheduler() {
    console.log('🕰️ [DriveBot] Programador iniciado: Ejecutando cada 5 minutos.');
    // Run immediately on boot
    runDriveImportCycle();

    // Schedule
    cron.schedule('*/5 * * * *', () => {
        runDriveImportCycle();
    });
}

module.exports = { startScheduler, runDriveImportCycle };
