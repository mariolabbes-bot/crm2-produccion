const { downloadFile } = require('../src/services/googleDriveService');
const path = require('path');

async function download() {
    const fileId = '1sHAoasE9-gQsJAeJCxuKuYqMURMGtETZ'; // RECAUDACION 02-2026.xlsx
    const dest = path.join(__dirname, '../temp_recaudacion.xlsx');

    console.log(`⬇️ Descargando ${fileId} a ${dest}...`);

    try {
        await downloadFile(fileId, dest);
        console.log('✅ Descarga completada.');
    } catch (error) {
        console.error('❌ Error descarga:', error);
    }
}

download();
