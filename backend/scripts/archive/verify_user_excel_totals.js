const xlsx = require('xlsx');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../bulk_data/VERIFICADOR VENTA 01-2026.xlsx');
const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets['BASE VENTAS'];
const data = xlsx.utils.sheet_to_json(sheet);

console.log(`Total rows in BASE VENTAS: ${data.length}`);

let totalLubricantesLitros = 0;
let totalTBRUnits = 0;
let totalPCRUnits = 0;
let totalReencaucheUnits = 0;

// Helper para normalizar strings (quitar acentos, uppercase)
const norm = (str) => str ? str.toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

data.forEach(row => {
    // Detectar nombres de columnas (pueden venir con caracteres raros del log anterior)
    // Headers log: 'L√≠nea', 'Sublinea', 'LITROS', 'Cantidad'

    // Intenta encontrar las keys correctas inspeccionando una fila si es necesario, 
    // pero xlsx.utils.sheet_to_json usa las keys exactas del header.
    // Mapeo manual basado en el output anterior:
    const linea = row['L√≠nea'] || row['Linea'];
    const sublinea = row['Sublinea'];
    const litros = row['LITROS'];
    const cantidad = row['Cantidad'] || 0;
    const marca = row['Marca'];

    const lineaNorm = norm(linea);
    const sublineaNorm = norm(sublinea);
    const marcaNorm = norm(marca);

    // 1. Lubricantes
    if (lineaNorm.includes('LUBRICANTE')) {
        // El usuario dice 34131. Si la columna LITROS ya tiene el total por fila o por unidad?
        // En el sample row: Cantidad=1, LITROS=1. Asumo LITROS es por fila (Total Litros) ?
        // O LITROS es por unidad? 
        // Sample: SKU SHE-550... DESC 1 LTS. Cantidad 1. LITROS 1. 
        // Si Cantidad fuera 10, LITROS seria 10 o 1? 
        // Vamos a sumar 'LITROS' directamente si existe, asumiendo que es el total calculado por el usuario o 
        // si es unitario, multiplicamos.
        // PERO, en el header dice 'LITROS' a secas.
        // Voy a asumir primero que la columna LITROS en BASE VENTAS es el valor final a sumar.
        if (litros) {
            totalLubricantesLitros += parseFloat(litros);
        }
    }

    // 2. TBR (El usuario dice "Neumáticos TBR")
    if (sublineaNorm.includes('TBR') && lineaNorm.includes('NEUMATICO')) {
        totalTBRUnits += parseFloat(cantidad);
    }

    // 3. PCR (El usuario dice "Neumáticos PCR")
    if (sublineaNorm.includes('PCR') && lineaNorm.includes('NEUMATICO')) {
        totalPCRUnits += parseFloat(cantidad);
    }

    // 4. Reencauche
    if (lineaNorm.includes('REENCAUCHE')) {
        totalReencaucheUnits += parseFloat(cantidad);
    }
});

console.log('--- RESULTADOS DEL EXCEL (BASE VENTAS) ---');
console.log(`Lubricantes (Litros): ${totalLubricantesLitros.toLocaleString()}`);
console.log(`TBR (Unidades): ${totalTBRUnits}`);
console.log(`PCR (Unidades): ${totalPCRUnits}`);
console.log(`Reencauche (Unidades): ${totalReencaucheUnits}`);
