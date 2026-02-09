const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const FILE_PATH = path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026/VENTAS.xlsx');

const runTest = async () => {
    console.log('--- TEST ASIGNACIÓN PRODUCTO ---');
    console.log(`Archivo: ${path.basename(FILE_PATH)}`);

    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Find a Shell product row
    const shellRow = data.find(r => JSON.stringify(r).toUpperCase().includes('SHE-550040618L'));

    if (!shellRow) {
        console.log('No se encontró SKU de prueba SHE-550040618L');
        return;
    }

    console.log('\n1. DATOS ORIGINALES EN EXCEL:');
    console.log(shellRow);

    // Current Logic Simulation (from ventas.js)
    console.log('\n2. LÓGICA ACTUAL (Stub):');
    const sku = shellRow['SKU'];
    const desc = shellRow['Descripci√≥n']; // Note the encoding issue
    console.log(`INSERT INTO producto (sku, descripcion, familia, marca, subfamilia) VALUES ('${sku}', '${desc}', 'SIN CLASIFICAR', 'GENERICO', 'SIN CLASIFICAR')`);
    console.log('-> Resultado: Familia perdida, Litros 0.');

    // Proposed Logic Simulation
    console.log('\n3. LÓGICA PROPUESTA (Extracción):');

    // Helper to find cols agnostic of encoding
    const findVal = (row, keyPattern) => {
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyPattern));
        return row[key];
    };

    const familiaProposed = findVal(shellRow, 'nea') && !findVal(shellRow, 'sub') ? findVal(shellRow, 'nea') : 'SIN CLASIFICAR'; // 'L√≠nea'
    const subfamiliaProposed = findVal(shellRow, 'sublinea') || findVal(shellRow, 'subl') || 'SIN CLASIFICAR';
    const marcaProposed = findVal(shellRow, 'marca') || 'GENERICO';

    // Litros extraction from description?
    // "BIDON HELIX ULTRA AG 5W30 1 LTS (EU)"
    const extractLitros = (desc) => {
        const match = desc.match(/(\d+)\s*LTS?/i) || desc.match(/(\d+)\s*LITROS?/i);
        return match ? parseFloat(match[1]) : 0;
    };
    const litrosProposed = extractLitros(desc);

    console.log(`UPDATE producto SET`);
    console.log(`  familia = '${familiaProposed}'`);
    console.log(`  subfamilia = '${subfamiliaProposed}'`);
    console.log(`  marca = '${marcaProposed}'`);
    console.log(`  litros_por_unidad = ${litrosProposed}`);
    console.log(`WHERE sku = '${sku}'`);
};

runTest();
