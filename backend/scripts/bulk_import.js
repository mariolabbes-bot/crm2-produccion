
const fs = require('fs');
const path = require('path');
const pool = require('../src/db'); // Adjust path to db connection
const { createJob, updateJobStatus, processVentasFileAsync, processAbonosFileAsync, processClientesFileAsync, processSaldoCreditoFileAsync, processProductosFileAsync } = require('../src/services/importJobs');

const BULK_DIR = path.join(__dirname, '../bulk_data');

async function runBulkImport() {
    console.log(`🚀 Iniciando Importación Masiva desde: ${BULK_DIR}`);

    if (!fs.existsSync(BULK_DIR)) {
        console.error(`❌ Directorio no existe: ${BULK_DIR}`);
        return;
    }

    const files = fs.readdirSync(BULK_DIR).filter(f => !f.startsWith('.') && !f.startsWith('PROCESSED_') && (f.endsWith('.xlsx') || f.endsWith('.xls')));

    if (files.length === 0) {
        console.log("⚠️ No se encontraron archivos Excel en la carpeta.");
        return;
    }

    console.log(`📋 Archivos encontrados: ${files.length}`);

    // Sort files by dependency: Clientes -> Productos -> Ventas -> Abonos -> Saldo
    const getOrder = (name) => {
        const n = name.toLowerCase();
        if (n.includes('cliente') || n.includes('base')) return 1;
        if (n.includes('producto') || n.includes('sku') || n.includes('maestro')) return 2;
        if (n.includes('venta')) return 3;
        if (n.includes('abono')) return 4;
        if (n.includes('saldo') || n.includes('estado')) return 5;
        return 99;
    };

    files.sort((a, b) => {
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b); // Alphabetical tie-break
    });

    for (const file of files) {
        const filePath = path.join(BULK_DIR, file);
        const fileName = file.toLowerCase();
        let type = null;

        if (fileName.includes('venta')) type = 'ventas';
        else if (fileName.includes('abono')) type = 'abonos';
        else if (fileName.includes('cliente') || fileName.includes('base')) type = 'clientes';
        else if (fileName.includes('saldo') || fileName.includes('estado') || fileName.includes('cuenta')) type = 'saldo_credito';
        else if (fileName.includes('producto') || fileName.includes('sku') || fileName.includes('maestro')) type = 'productos';
        // Add product type if you have an importer for it, otherwise skipping for now or treating as generic

        if (!type) {
            console.log(`⚠️ Saltando archivo desconocido o sin importador: ${file}`);
            continue;
        }

        console.log(`\n🔵 Procesando: ${file} como [${type.toUpperCase()}]`);

        try {
            // Create Job in DB to track history
            // We use 'SYSTEM' as userRut for bulk imports
            const jobId = await createJob(type, file, 'SYSTEM-BULK');
            console.log(`   Detailed Job ID: ${jobId}`);

            // Execute Import synchronously for the script (one by one)
            // Note: The service functions are async and designed for workers, but we can await them here.

            if (type === 'ventas') {
                await processVentasFileAsync(jobId, filePath, file);
            } else if (type === 'abonos') {
                await processAbonosFileAsync(jobId, filePath, file);
            } else if (type === 'clientes') {
                await processClientesFileAsync(jobId, filePath, file);
            } else if (type === 'saldo_credito') {
                await processSaldoCreditoFileAsync(jobId, filePath, file);
            } else if (type === 'productos') {
                await processProductosFileAsync(jobId, filePath, file);
            }

            console.log(`✅ Éxito: ${file}`);

            // Optional: Move to a 'processed' folder?
            // For now, leave it or rename it.
            const processedPath = path.join(BULK_DIR, `PROCESSED_${file}`);
            fs.renameSync(filePath, processedPath);

        } catch (error) {
            console.error(`❌ Error procesando ${file}:`, error.message);
        }
    }

    console.log("\n🏁 Importación Masiva Finalizada.");
    process.exit(0);
}

runBulkImport();
