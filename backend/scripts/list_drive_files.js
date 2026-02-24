const { listUnprocessedFiles, ensureSubfolders, googleDriveClient } = require('../src/services/googleDriveService');

async function listFiles() {
    console.log('📂 Escaneando Google Drive...');
    const DRIVE_FOLDER_ID = '1qPyGG4hYSIgdYSQimFnYiBrubOYC6U_7'; // Hardcoded from importAutomation.js

    try {
        // 1. Root Files
        console.log('\n--- Raíz (Pendientes) ---');
        const rootFiles = await listUnprocessedFiles(DRIVE_FOLDER_ID);
        if (rootFiles.length === 0) console.log('(Vacío)');
        rootFiles.forEach(f => console.log(`[${f.id}] ${f.name} (Created: ${f.createdTime})`));

        // 2. Procesados
        console.log('\n--- PROCESADOS ---');
        const folders = await ensureSubfolders(DRIVE_FOLDER_ID);
        if (folders.PROCESADOS) {
            // Reusing logic similar to listUnprocessedFiles but for PROCESADOS folder
            const drive = googleDriveClient();
            const res = await drive.files.list({
                q: `'${folders.PROCESADOS}' in parents and trashed = false`,
                fields: 'files(id, name, createdTime, modifiedTime)',
                orderBy: 'createdTime desc',
                pageSize: 20
            });
            const procFiles = res.data.files;
            if (procFiles.length === 0) console.log('(Vacío)');
            procFiles.forEach(f => console.log(`[${f.id}] ${f.name} (Created: ${f.createdTime})`));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

listFiles();
