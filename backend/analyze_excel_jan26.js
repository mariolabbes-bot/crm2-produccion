const XLSX = require('xlsx');
const path = require('path');
const pool = require('./src/db');

async function analyze() {
    try {
        const filePath = path.join(__dirname, 'bulk_data', 'ABONOS_19-01-2026.xlsx');
        console.log(`Leyendo archivo: ${filePath}`);

        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Total filas en Excel: ${data.length}`);

        // Aggregate Excel by Folio
        const excelByFolio = new Map(); // Folio -> { count, sum }
        let totalExcelSum = 0;

        data.forEach(row => {
            const keys = Object.keys(row);
            const keyFolio = keys.find(k => /folio/i.test(k)) || 'Folio';
            const keyMonto = keys.find(k => /monto/i.test(k) && !/total/i.test(k)) || 'Monto';

            const folio = String(row[keyFolio]).trim();
            const monto = parseFloat(row[keyMonto]) || 0;
            totalExcelSum += monto;

            if (!excelByFolio.has(folio)) excelByFolio.set(folio, { count: 0, sum: 0 });
            const e = excelByFolio.get(folio);
            e.count++;
            e.sum += monto;
        });

        console.log(`Suma TOTAL Excel 'Monto': $${totalExcelSum.toLocaleString('es-CL')}`);

        // DB Comparison for Jan 2026
        const dbRes = await pool.query(`
            SELECT folio, COUNT(*) as count, SUM(monto) as sum_monto
            FROM abono
            WHERE fecha >= '2026-01-01' AND fecha < '2026-02-01'
            GROUP BY folio
        `);

        let totalDbSum = 0;
        const dbByFolio = new Map();
        dbRes.rows.forEach(r => {
            const m = parseInt(r.sum_monto || 0);
            totalDbSum += m;
            dbByFolio.set(r.folio, { count: parseInt(r.count), sum: m });
        });

        console.log('\n--- DB Enero 2026 ---');
        console.log(`Total DB Sum: $${totalDbSum.toLocaleString('es-CL')}`);

        const diff = totalExcelSum - totalDbSum;
        console.log(`Diferencia Global: $${diff.toLocaleString('es-CL')}`);

        // Compare Per Folio details
        console.log('\n--- Comparación por Folio (Diferencias Detectadas) ---');
        console.log('Folio | Excel Count | DB Count | Excel Sum | DB Sum | Diff');
        let diffCount = 0;
        let diffSumTotal = 0;

        const diffs = [];

        for (const [folio, eData] of excelByFolio) {
            const dbData = dbByFolio.get(folio);
            if (!dbData) {
                // Completely missing folio
                diffs.push({ folio, excelCount: eData.count, dbCount: 0, excelSum: eData.sum, dbSum: 0, diff: eData.sum });
                diffCount++;
                diffSumTotal += eData.sum;
                continue;
            }

            const countDiff = eData.count !== dbData.count;
            const sumDiff = Math.abs(eData.sum - dbData.sum) > 5; // tolerance

            if (countDiff || sumDiff) {
                diffs.push({ folio, excelCount: eData.count, dbCount: dbData.count, excelSum: eData.sum, dbSum: dbData.sum, diff: eData.sum - dbData.sum });
                diffCount++;
                diffSumTotal += (eData.sum - dbData.sum);
            }
        }

        // Sort by diff amount desc
        diffs.sort((a, b) => b.diff - a.diff);

        if (diffs.length > 0) {
            console.table(diffs.slice(0, 10)); // Show top 10 discrepancies
            console.log(`... y ${diffs.length - 10} más.`);
        } else {
            console.log('No se encontraron diferencias por folio.');
        }

        // Inspect Folio 222088
        console.log('\n--- Detalle Excel Folio 222088 ---');
        data.filter(r => String(r['Folio']).trim() === '222088').forEach(r => {
            console.log(JSON.stringify(r));
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

analyze();
