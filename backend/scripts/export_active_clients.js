const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function exportActiveClients() {
    try {
        console.log('🚀 Iniciando exportación de clientes activos (Ventas 2024+)...');

        // Query para obtener clientes con ventas >= 2024
        const query = `
            SELECT DISTINCT c.* 
            FROM cliente c
            JOIN venta v ON c.rut = v.identificador
            WHERE v.fecha_emision >= '2024-01-01'
            ORDER BY c.nombre ASC
        `;

        const res = await pool.query(query);
        const clients = res.rows;

        console.log(`📊 Total de clientes activos encontrados: ${clients.length}`);

        // Crear carpeta de exportaciones si no existe
        const exportDir = path.join(__dirname, '../exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        const ws = XLSX.utils.json_to_sheet(clients);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes_Activos_2024');

        const fileName = `Clientes_Activos_Desde_2024_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filePath = path.join(exportDir, fileName);

        XLSX.writeFile(wb, filePath);

        console.log(`✅ Archivo generado exitosamente en: ${filePath}`);
        return filePath;
    } catch (err) {
        console.error('❌ Error exporting active clients:', err);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    exportActiveClients();
}

module.exports = exportActiveClients;
