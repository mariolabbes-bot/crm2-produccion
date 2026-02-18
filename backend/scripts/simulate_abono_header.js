const XLSX = require('xlsx');

// Simulating the logic from abonos.js
function findCol(headers, patterns) {
    return headers.find(h => patterns.some(p => p.test(h))) || null;
}

const mockHeaders = [
    'Folio',
    'Fecha',
    'Monto',
    'Identificador', // Client RUT
    'Identificador_1', // Suspected Abono ID
    'Cliente',
    'Vendedor',
    'Sucursal'
];

console.log('--- simulation Header Detection ---');
console.log('Headers available:', mockHeaders);

const colIdentificadorAbono = findCol(mockHeaders, [/^Identificador_1$/i, /^Identificador.*abono/i, /^Identificador.*2$/i]);
console.log(`Matched 'Identificador Abono' to column: "${colIdentificadorAbono}"`);

if (colIdentificadorAbono) {
    console.log('CONFIRMED: Logic correctly maps to Identificador_1');
} else {
    console.log('FAILED: Regex did not match Identificador_1');
}
