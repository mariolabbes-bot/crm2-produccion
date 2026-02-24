const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function auditDiscrepancy() {
    console.log('🔍 Iniciando Auditoría Forense de Abonos (Discrepancia Montos)...');

    // 1. Identificar archivo fuente (El más reciente de Abonos en bulk_data o temp)
    // Asumiremos que el usuario se refiere al archivo de FEBRERO 2026.
    // Buscaremos "ABONO AL 08-02-2026.xlsx" que aparece en el listado anterior como candidato probable.
    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error('❌ No se encontró el archivo específico: ' + filePath);
        console.log('⚠️ Por favor indica la ruta exacta si es otro archivo.');
        process.exit(1);
    }

    console.log(`📂 Analizando archivo: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // 2. Calcular Totales del Excel (Simulando la lógica de importación)
    let excelSum = 0;
    let excelNetoSum = 0;
    let excelCount = 0;
    const excelFolios = new Map(); // Folio -> { monto, fecha, row }

    data.forEach((row, idx) => {
        // Normalizar nombres de columnas (mismo criterio que importer)
        const montoKey = Object.keys(row).find(k => /Monto/i.test(k));
        const folioKey = Object.keys(row).find(k => /Folio/i.test(k));
        const fechaKey = Object.keys(row).find(k => /Fecha/i.test(k));

        if (montoKey && folioKey && row[montoKey]) {
            const monto = parseFloat(row[montoKey]);
            const folio = String(row[folioKey]).trim();

            // Filtro de fecha: Solo Febrero 2026 (para comparar peras con peras)
            // OJO: Excel date parse es tricky, asumiremos parse simple o string check para filtrar
            // Si el usuario habla de "planilla de importacion", asumimos que TODO el archivo se importa.
            // Pero el dashboard muestra un rango. Debemos saber qué rango muestra el dashboard. 
            // Asumiremos TODO Febrero por contexto anterior.

            // Sumar todo lo del archivo para ver si cuadra con la cifra "255.828.125" que dio el usuario
            excelSum += monto;
            excelNetoSum += Math.round(monto / 1.19);
            excelCount++;

            if (excelFolios.has(folio)) {
                // console.log(`⚠️ Folio duplicado en Excel: ${folio} (Fila ${idx+2})`);
                // Si hay duplicados en excel con mismo folio, el importer SOLO IMPORTA UNO (el último o primero depende de lógica, o merge).
                // Nuestra lógica actual hace MERGE por Folio+ID. Si ID es vacío, es por Folio.
                // Si hay 2 filas con mismo folio en excel, el importer procesará ambas.
                // Si tienen mismo ID (o vacio), la segunda hará UPDATE sobre la primera.
                // PORT TANTO: En BD quedará solo 1 registro con el valor del último.
                // PERO: En la suma del Excel "a mano", el usuario suma AMBAS filas.
                // ESTA PUEDE SER LA CAUSA DE LA DISCREPANCIA.
                excelFolios.get(folio).count++;
                excelFolios.get(folio).totalMonto += monto;
            } else {
                excelFolios.set(folio, { monto, count: 1, totalMonto: monto });
            }
        }
    });

    console.log('\n📊 Resumen EXCEL (Cálculo Bruto):');
    console.log(`   Total Filas con Monto: ${excelCount}`);
    console.log(`   Suma Monto Bruto: $${excelSum.toLocaleString('es-CL')}`);
    console.log(`   Suma Monto Neto (Estiado /1.19): $${excelNetoSum.toLocaleString('es-CL')}`);
    console.log(`   Folios Únicos: ${excelFolios.size}`);

    // 3. Obtener Datos de BD para esos folios
    // Traemos todos los abonos que coincidan con los folios del excel
    const allFolios = Array.from(excelFolios.keys());
    // Chunking to avoid massive IN clause
    let dbSum = 0;
    let dbCount = 0;
    let missingFolios = [];

    // Verificamos totales en BD para el periodo (independiente del folio, para ver dashboard)
    const resDbTotal = await pool.query(`
        SELECT SUM(monto) as total_monto, COUNT(*) as count 
        FROM abono 
        WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
    `);

    console.log('\n🗄️ Resumen BASE DE DATOS (Febrero 2026):');
    console.log(`   Total Registros: ${resDbTotal.rows[0].count}`);
    console.log(`   Suma Monto (Dashboard): $${parseInt(resDbTotal.rows[0].total_monto || 0).toLocaleString('es-CL')}`);

    // 4. Análisis de Discrepancia por Duplicados de Folio en Excel
    let sumDuplicadosExcel = 0;
    let countDuplicadosExcel = 0;
    console.log('\n🕵️ Análisis de "Falsos Duplicados" (Mismo Folio en Excel):');
    let headerPrinted = false;
    for (const [folio, data] of excelFolios) {
        if (data.count > 1) {
            if (!headerPrinted) {
                console.log('   Folio      | Veces en Excel | Monto Acumulado Excel | Monto en BD (Aprox)');
                console.log('   -----------|----------------|-----------------------|--------------------');
                headerPrinted = true;
            }
            if (countDuplicadosExcel < 10) {
                console.log(`   ${folio.padEnd(10)} | ${String(data.count).padEnd(14)} | $${data.totalMonto.toLocaleString().padEnd(20)} | (Se guarda solo 1 vez)`);
            }
            // La diferencia es: (Suma Total Excel) - (Monto Real 1 vez)
            // Ejemplo: Excel tiene 3 filas de 100. Suma Excel=300. BD guarda 1 de 100. Dif=200.
            // Dif = TotalMonto - (TotalMonto / count) ... asumiendo montos iguales
            // Si montos son distintos, la BD se queda con el ULTIMO.
            const montoUnitario = data.totalMonto / data.count; // Simplificación
            sumDuplicadosExcel += (data.totalMonto - montoUnitario);
            countDuplicadosExcel += (data.count - 1);
        }
    }
    if (countDuplicadosExcel > 10) console.log(`   ... y ${countDuplicadosExcel - 10} casos más.`);

    console.log('\n💡 HIPÓTESIS:');
    console.log(`   Suma "Extra" en Excel por folios repetidos: $${sumDuplicadosExcel.toLocaleString('es-CL')}`);
    console.log(`   Si restamos esto al Excel: $${(excelSum - sumDuplicadosExcel).toLocaleString('es-CL')}`);

    const dif = Math.abs(parseInt(resDbTotal.rows[0].total_monto || 0) - (excelSum - sumDuplicadosExcel));
    console.log(`   Diferencia residual con BD: $${dif.toLocaleString('es-CL')}`);

    pool.end();
}

auditDiscrepancy();
