const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function exportClientsToExcel() {
    try {
        console.log('🚀 Iniciando exportación de clientes...');

        const res = await pool.query('SELECT * FROM cliente ORDER BY nombre ASC');
        const clients = res.rows;

        console.log(`📊 Total de registros encontrados: ${clients.length}`);

        // Crear carpeta de exportaciones si no existe
        const exportDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        const ws = XLSX.utils.json_to_sheet(clients);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

        const fileName = `Base_Clientes_Completa_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filePath = path.join(exportDir, fileName);

        XLSX.writeFile(wb, filePath);

        console.log(`✅ Archivo generado exitosamente en: ${filePath}`);
        return filePath;
    } catch (err) {
        console.error('❌ Error exporting clients:', err);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    exportClientsToExcel();
}

module.exports = exportClientsToExcel;
