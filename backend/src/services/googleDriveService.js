const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(__dirname, '../../google_drive_credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Initialize Auth
let authData;
if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
        console.log('🔑 [DriveService] Cargando credenciales desde ENV (GOOGLE_CREDENTIALS_JSON)...');
        authData = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
        console.error('❌ Error parseando GOOGLE_CREDENTIALS_JSON:', e.message);
    }
}

const auth = new google.auth.GoogleAuth({
    keyFile: !authData ? CREDENTIALS_PATH : undefined,
    credentials: authData,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Lists files in a specific folder that match proper naming conventions.
 * @param {string} folderId - The ID of the folder to scan.
 */
async function listUnprocessedFiles(folderId) {
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime desc'
        });
        return res.data.files;
    } catch (error) {
        console.error('Error listing files from Drive:', error.message);
        throw error;
    }
}

/**
 * Downloads a file from Drive to a local path.
 * @param {string} fileId 
 * @param {string} destPath 
 */
async function downloadFile(fileId, destPath) {
    const dest = fs.createWriteStream(destPath);
    try {
        const res = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        return new Promise((resolve, reject) => {
            res.data
                .on('end', () => resolve(destPath))
                .on('error', err => reject(err))
                .pipe(dest);
        });
    } catch (error) {
        console.error(`Error downloading file ${fileId}:`, error.message);
        throw error;
    }
}

/**
 * Moves a file to a different folder (e.g., Processed or Errors)
 * @param {string} fileId 
 * @param {string} currentFolderId 
 * @param {string} targetFolderId 
 */
async function moveFile(fileId, currentFolderId, targetFolderId) {
    try {
        // 1. Retrieve the existing parents to remove
        const file = await drive.files.get({
            fileId: fileId,
            fields: 'parents'
        });

        // 2. Move (Google Drive API v3: parents is an array of strings, no .id property needed)
        const previousParents = file.data.parents ? file.data.parents.join(',') : '';

        const updateParams = {
            fileId: fileId,
            addParents: targetFolderId,
            fields: 'id, parents'
        };

        if (previousParents) {
            updateParams.removeParents = previousParents;
        }

        await drive.files.update(updateParams);
    } catch (error) {
        console.error(`Error moving file ${fileId}:`, error.message);
        // Don't throw, just log. Moving is non-critical for the import itself, just for cleanup.
    }
}

/**
 * Ensures subfolders 'PROCESADOS' and 'ERRORES' exist.
 * Returns their IDs.
 */
async function ensureSubfolders(parentId) {
    const subfolders = { PROCESADOS: null, ERRORES: null };

    try {
        // List existing folders
        const res = await drive.files.list({
            q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)'
        });

        const existing = res.data.files;
        existing.forEach(f => {
            if (f.name.toUpperCase() === 'PROCESADOS') subfolders.PROCESADOS = f.id;
            if (f.name.toUpperCase() === 'ERRORES') subfolders.ERRORES = f.id;
        });

        // Create if missing
        if (!subfolders.PROCESADOS) subfolders.PROCESADOS = await createFolder('PROCESADOS', parentId);
        if (!subfolders.ERRORES) subfolders.ERRORES = await createFolder('ERRORES', parentId);

    } catch (error) {
        console.error('Error ensuring subfolders:', error.message);
    }

    return subfolders;
}

async function createFolder(name, parentId) {
    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });
    return file.data.id;
}

module.exports = {
    listUnprocessedFiles,
    downloadFile,
    moveFile,
    ensureSubfolders
};
