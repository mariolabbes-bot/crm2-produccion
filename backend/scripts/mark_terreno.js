const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');

async function markClientsWithCircuit(filePath) {
    const client = await pool.connect();
    try {
        console.log(`📂 Leyendo planilla: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`📊 Procesando ${data.length} registros...`);

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const row of data) {
            // Buscamos columnas RUT y CIRCUITO (case insensitive)
            const rutKey = Object.keys(row).find(k => k.toUpperCase() === 'RUT');
            const circuitKey = Object.keys(row).find(k => k.toUpperCase() === 'CIRCUITO');

            const rut = row[rutKey] ? String(row[rutKey]).trim() : null;
            const circuit = row[circuitKey] ? String(row[circuitKey]).trim() : 'General';

            if (rut) {
                const res = await client.query(
                    'UPDATE cliente SET es_terreno = TRUE, circuito = $1 WHERE rut = $2 RETURNING id',
                    [circuit, rut]
                );

                if (res.rowCount > 0) {
                    updatedCount++;
                } else {
                    console.warn(`⚠️ RUT no encontrado en BD: ${rut}`);
                    notFoundCount++;
                }
            }
        }

        console.log('🏁 Proceso finalizado.');
        console.log(`   ✅ Clientes vinculados a circuitos: ${updatedCount}`);
        console.log(`   ❌ RUTs no encontrados: ${notFoundCount}`);

    } catch (err) {
        console.error('❌ Error procesando planilla:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Uso: node scripts/mark_terreno.js <ruta_al_excel>');
        process.exit(1);
    }
    markClientsWithCircuit(path.resolve(filePath));
}

module.exports = markClientsWithCircuit;
