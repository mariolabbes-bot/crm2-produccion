const XLSX = require('xlsx');
const path = require('path');
const pool = require('./src/db');

async function generateReport() {
    try {
        console.log('--- Generando Reporte de Irregularidades Enero 2026 ---');
        const filePath = path.join(__dirname, 'bulk_data', 'ABONOS_19-01-2026.xlsx');

        // 1. Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        // 2. Aggregate Excel by Folio
        const excelByFolio = new Map();
        data.forEach(row => {
            const keys = Object.keys(row);
            const keyFolio = keys.find(k => /folio/i.test(k)) || 'Folio';
            const keyMonto = keys.find(k => /monto/i.test(k) && !/total/i.test(k)) || 'Monto';

            const folio = String(row[keyFolio]).trim();
            const monto = parseFloat(row[keyMonto]) || 0;

            if (!excelByFolio.has(folio)) excelByFolio.set(folio, { count: 0, sum: 0, rows: [] });
            const e = excelByFolio.get(folio);
            e.count++;
            e.sum += monto;
            e.rows.push(row);
        });

        // 3. Aggregate DB by Folio
        const dbRes = await pool.query(`
            SELECT folio, COUNT(*) as count, SUM(monto) as sum_monto
            FROM abono
            WHERE fecha >= '2026-01-01' AND fecha < '2026-02-01'
            GROUP BY folio
        `);

        const dbByFolio = new Map();
        dbRes.rows.forEach(r => {
            dbByFolio.set(r.folio, { count: parseInt(r.count), sum: parseInt(r.sum_monto || 0) });
        });

        // 4. Compare and Build Report
        const irregularities = [];

        for (const [folio, eData] of excelByFolio) {
            const dbData = dbByFolio.get(folio);

            let status = 'OK';
            let diff = 0;
            let dbCount = 0;
            let dbSum = 0;

            if (!dbData) {
                status = 'Faltante Total';
                diff = eData.sum;
            } else {
                dbCount = dbData.count;
                dbSum = dbData.sum;
                diff = eData.sum - dbSum;

                if (Math.abs(diff) > 10) status = 'Diferencia Monto';
                else if (eData.count !== dbCount) status = 'Diferencia Cantidad (Posible Duplicado Oculto)';
            }

            if (status !== 'OK') {
                irregularities.push({
                    Folio: folio,
                    'Estado': status,
                    'Diferencia ($)': diff,
                    'Excel Cantidad': eData.count,
                    'DB Cantidad': dbCount,
                    'Excel Suma': eData.sum,
                    'DB Suma': dbSum
                });
            }
        }

        // Sort by diff descending
        irregularities.sort((a, b) => b['Diferencia ($)'] - a['Diferencia ($)']);

        console.log(`Encontradas ${irregularities.length} irregularidades.`);

        // 5. Write to Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(irregularities);
        XLSX.utils.book_append_sheet(wb, ws, "Irregularidades");

        const outputFilename = 'reporte_irregularidades_enero_2026.xlsx';
        const outputPath = path.join(__dirname, outputFilename);
        XLSX.writeFile(wb, outputPath);

        console.log(`Reporte guardado en: ${outputPath}`);
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

generateReport();
