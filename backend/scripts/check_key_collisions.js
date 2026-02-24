const pool = require('../src/db');
const XLSX = require('xlsx');
const path = require('path');
const { parseExcelDate, parseNumeric } = require('../src/services/importers/utils');

async function checkKeyCollisions() {
    console.log('💥 Analizando Colisiones de Llave (Folio + ID Abono) en Excel...');
    console.log('   Si hay colisiones, el sistema guarda 1 registro pero el usuario suma N registros.');

    const filePath = path.join(__dirname, '../bulk_data/IMPORTACION 08-02-2026/ABONO AL 08-02-2026.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    let sumTotalExcel = 0;
    let countTotalExcel = 0;

    // Mapa para detectar colisiones
    const keyMap = new Map(); // Key -> { count, sum }

    data.forEach(row => {
        const getVal = (patterns) => {
            const key = Object.keys(row).find(k => patterns.some(p => p.test(k)));
            return key ? row[key] : null;
        };

        const folio = String(getVal([/^Folio$/i]) || '').trim();
        const idAbono = String(getVal([/^Identificador_1$/i, /^Identificador.*abono/i]) || '').trim();
        const montoRaw = getVal([/^Monto$/i]);
        const fecha = getVal([/^Fecha$/i, /Fecha.*abono/i]);

        if (!folio || !montoRaw) return;

        const monto = parseNumeric(montoRaw);
        if (!monto) return;
        const montoNeto = Math.round(monto / 1.19);

        // FEBRERO FILTER (Solo lo que interesa al usuario)
        const d = parseExcelDate(fecha);
        if (d && d.getMonth() === 1 && d.getFullYear() === 2026) {
            sumTotalExcel += montoNeto;
            countTotalExcel++;

            const key = `${folio}-${idAbono}`;
            if (!keyMap.has(key)) {
                keyMap.set(key, { count: 0, sum: 0, examples: [] });
            }
            const entry = keyMap.get(key);
            entry.count++;
            entry.sum += montoNeto;
            entry.examples.push(montoNeto);
        }
    });

    console.log(`\n📊 Resumen EXCEL (Febrero):`);
    console.log(`   Filas Totales: ${countTotalExcel}`);
    console.log(`   Llaves Únicas: ${keyMap.size}`);
    console.log(`   Suma TOTAL (Todas las filas): $${sumTotalExcel.toLocaleString('es-CL')}`);

    // Buscar Colisiones
    let collisionCount = 0;
    let lostMoney = 0; // Dinero que se pierde al fusionar (Total - MaxValue de la llave)
    // O Total - LastValue. Supongamos que BD se queda con 1.

    console.log('\n💥 Detalle de Colisiones (Llaves con >1 fila):');
    let printed = 0;

    for (const [key, val] of keyMap) {
        if (val.count > 1) {
            collisionCount++;
            // Dinero perdido = (Suma Total de la llave) - (Promedio o Valor único esperado)
            // Si son pagos distintos con MISMO ID, el sistema guarda 1. Se pierden N-1.
            // Asumamos que se queda con el mayor? No, update reemplaza. Se queda con el último.
            // Para estimar pérdida, digamos que se pierde `Sum - (Sum/Count)`.
            const kept = val.sum / val.count; // Aprox
            const lost = val.sum - kept;
            lostMoney += lost;

            if (printed < 10) {
                console.log(`   Key [${key}]: ${val.count} filas. Suma: $${val.sum.toLocaleString()} (Se guardó solo 1 -> Pérdida estimada: $${lost.toLocaleString()})`);
                printed++;
            }
        }
    }

    console.log(`\n🚨 TOTAL COLISIONES: ${collisionCount} llaves repetidas.`);
    console.log(`📉 Estimación de Dinero "Perdido" por Fusión: $${lostMoney.toLocaleString('es-CL')}`);

    pool.end();
}

checkKeyCollisions();
