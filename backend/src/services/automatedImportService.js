const fs = require('fs');
const path = require('path');
const { processVentasFileAsync } = require('./importers/ventas');
const { processAbonosFileAsync } = require('./importers/abonos');
const { processClientesFileAsync } = require('./importers/clientes');
const { processSaldoCreditoFileAsync } = require('./importers/saldo_credito');
const { sendEmail } = require('../providers/emailProvider');

const AUTO_IMPORT_DIR = path.join(__dirname, '../../uploads/auto_import');
const IN_DIR = path.join(AUTO_IMPORT_DIR, 'in');
const PROCESSED_DIR = path.join(AUTO_IMPORT_DIR, 'processed');
const FAILED_DIR = path.join(AUTO_IMPORT_DIR, 'failed');

const ensureDirs = () => {
    try {
        [IN_DIR, PROCESSED_DIR, FAILED_DIR].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });
    } catch (err) {
        console.warn('⚠️ [AutoImport] No se pudieron crear directorios (posible entorno readonly o cloud):', err.message);
    }
};

const runAutoImport = async () => {
    // Si estamos en un entorno cloud efímero sin persistencia configurada, loguear aviso
    if (process.env.RENDER_SERVICE_ID && !process.env.PERSISTENT_STORAGE_ENABLED) {
        console.log('ℹ️ [AutoImport] Ejecución omitida en entorno efímero sin almacenamiento persistente. Use endpoint de carga directa.');
        return;
    }

    ensureDirs();
    console.log('🤖 [AutoImport] Iniciando escaneo de archivos...');

    let files = [];
    try {
        if (fs.existsSync(IN_DIR)) {
            files = fs.readdirSync(IN_DIR).filter(f => !f.startsWith('.'));
        }
    } catch (err) {
        console.error('❌ [AutoImport] Error leyendo directorio de entrada:', err.message);
        return;
    }

    if (files.length === 0) {
        console.log('🤖 [AutoImport] No hay archivos pendientes.');
        return;
    }

    const report = {
        scanTime: new Date().toLocaleString(),
        filesProcessed: [],
        errors: []
    };

    // Sort files to process roughly in order
    // Priority: Clientes -> Ventas -> Abonos -> Saldo Credito (Snapshot)
    const sortOrder = { 'cliente': 1, 'venta': 2, 'abono': 3, 'credito': 4 };
    files.sort((a, b) => {
        const typeA = getType(a);
        const typeB = getType(b);
        return (sortOrder[typeA] || 99) - (sortOrder[typeB] || 99);
    });

    for (const file of files) {
        const filePath = path.join(IN_DIR, file);
        const type = getType(file);
        const jobId = `AUTO-${Date.now()}`;

        let moveDest = null;
        const fileRes = { filename: file, status: 'pending', type };

        try {
            console.log(`🤖 [AutoImport] Procesando ${file} (Tipo: ${type || 'Unknown'})...`);

            if (!type) {
                throw new Error('No se pudo determinar el tipo de archivo por el nombre (debe incluir: ventas, abonos, clientes o saldo)');
            }

            let result = null;
            if (type === 'venta') {
                result = await processVentasFileAsync(jobId, filePath, file);
            } else if (type === 'abono') {
                result = await processAbonosFileAsync(jobId, filePath, file, { updateMissing: true });
            } else if (type === 'cliente') {
                if (processClientesFileAsync) {
                    result = await processClientesFileAsync(jobId, filePath, file);
                } else {
                    throw new Error('Importador de clientes no configurado aún');
                }
            } else if (type === 'credito') {
                result = await processSaldoCreditoFileAsync(jobId, filePath, file);
            }

            fileRes.status = 'success';
            fileRes.details = result;

            // Move to processed
            const dateFolder = new Date().toISOString().split('T')[0];
            const processedDayDir = path.join(PROCESSED_DIR, dateFolder);
            if (!fs.existsSync(processedDayDir)) fs.mkdirSync(processedDayDir, { recursive: true });
            moveDest = path.join(processedDayDir, file);

        } catch (error) {
            console.error(`❌ [AutoImport] Error en ${file}:`, error.message);
            fileRes.status = 'error';
            fileRes.error = error.message;
            moveDest = path.join(FAILED_DIR, file);
        }

        // Move file
        try {
            if (moveDest) {
                fs.renameSync(filePath, moveDest);
                fileRes.finalPath = moveDest;
            }
        } catch (mvErr) {
            console.error('Error moviendo archivo (posiblemente locked o readonly):', mvErr);
            fileRes.moveError = mvErr.message;
        }

        report.filesProcessed.push(fileRes);
    }

    // Send Email
    // Only send if there were files
    if (report.filesProcessed.length > 0) {
        await sendSummaryEmail(report);
    }

    console.log('🤖 [AutoImport] Finalizado.');
};

const getType = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('venta') || lower.includes('sales')) return 'venta';
    if (lower.includes('abono') || lower.includes('payment')) return 'abono';
    if (lower.includes('cliente') || lower.includes('client')) return 'cliente';
    // 'saldo' usually sufficient for 'saldo_credito' or 'saldo credito'
    if (lower.includes('saldo') || lower.includes('credito') || lower.includes('deuda')) return 'credito';
    return null;
};

const sendSummaryEmail = async (report) => {
    const successCount = report.filesProcessed.filter(f => f.status === 'success').length;
    const failCount = report.filesProcessed.filter(f => f.status === 'error').length;

    const subject = `[CRM2] Reporte Importación Automática - ${new Date().toLocaleDateString()}`;

    let html = `<h2>Reporte de Importación Automática</h2>`;
    html += `<p><strong>Fecha:</strong> ${report.scanTime}</p>`;
    html += `<p><strong>Total Archivos:</strong> ${report.filesProcessed.length} (✅ ${successCount} / ❌ ${failCount})</p>`;
    html += `<hr/>`;

    html += `<h3>Detalle:</h3><ul>`;
    for (const f of report.filesProcessed) {
        const color = f.status === 'success' ? 'green' : 'red';
        const icon = f.status === 'success' ? '✅' : '❌';
        html += `<li style="color:${color}">`;
        html += `<strong>${icon} ${f.filename}</strong> (${f.type})`;
        if (f.status === 'success') {
            const d = f.details || {};
            html += `<br/><small>Importados: ${d.imported || d.inserted || 0}, Duplicados: ${d.duplicates || 0}, Observaciones: ${(d.missingVendors || []).length + (d.missingClients || []).length}</small>`;
            if (d.pendingReportUrl || d.observationsReportUrl) {
                html += `<br/><small><i>(Se generaron reportes Excel, revisar en sistema)</i></small>`;
            }
        } else {
            html += `<br/><small>Error: ${f.error}</small>`;
        }
        html += `</li>`;
    }
    html += `</ul>`;

    const to = process.env.ADMIN_EMAIL || 'admin@crm2.com';

    await sendEmail({ to, subject, html });
};

module.exports = { runAutoImport };
