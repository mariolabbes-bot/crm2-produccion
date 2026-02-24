const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../uploads/reports/observaciones_ventas_undefined.xlsx');

try {
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Reporte de Observaciones: ${data.length} filas.`);

    if (data.length > 0) {
        console.log('🔍 Primeras 5 observaciones:');
        console.table(data.slice(0, 5));

        // Check distinct error messages
        const details = {};
        data.forEach(r => {
            const d = r.Detalle || r.detalle || 'Sin detalle';
            details[d] = (details[d] || 0) + 1;
        });
        console.log('\n📉 Resumen de Errores:');
        console.table(details);
    } else {
        console.log('✅ El reporte está vacío (No hubo errores).');
    }

} catch (e) {
    console.error('Error leyendo reporte:', e.message);
}
