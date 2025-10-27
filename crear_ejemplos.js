const XLSX = require('xlsx');

// Crear plantilla de ventas de ejemplo
const ventasData = [
  {
    'Folio': 12345,
    'Identificador': 'Factura',
    'Fecha': '15-03-2024',
    'Cliente': 'Empresa ABC S.A.',
    'Vendedor': 'Juan Pérez',
    'Cantidad': 10,
    'Precio': 250000
  },
  {
    'Folio': 12346,
    'Identificador': 'Boleta',
    'Fecha': '16-03-2024',
    'Cliente': 'Comercial XYZ Ltda.',
    'Vendedor': 'María González',
    'Cantidad': 5,
    'Precio': 180000
  },
  {
    'Folio': 12347,
    'Identificador': 'Factura',
    'Fecha': '17-03-2024',
    'Cliente': 'Inversiones 123',
    'Vendedor': 'Carlos López',
    'Cantidad': 15,
    'Precio': 450000
  }
];

const wsVentas = XLSX.utils.json_to_sheet(ventasData);
const wbVentas = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbVentas, wsVentas, 'Ventas');
XLSX.writeFile(wbVentas, 'EJEMPLO_VENTAS.xlsx');

console.log('✅ Archivo EJEMPLO_VENTAS.xlsx creado exitosamente');

// Crear plantilla de abonos de ejemplo
const abonosData = [
  {
    'Folio': 98765,
    'Fecha': '20-03-2024',
    'Cliente': 'Empresa ABC S.A.',
    'Monto': 100000,
    'Tipo de pago': 'Transferencia',
    'Vendedor': 'Juan Pérez'
  },
  {
    'Folio': 98766,
    'Fecha': '21-03-2024',
    'Cliente': 'Comercial XYZ Ltda.',
    'Monto': 80000,
    'Tipo de pago': 'Efectivo',
    'Vendedor': 'María González'
  },
  {
    'Folio': 98767,
    'Fecha': '22-03-2024',
    'Cliente': 'Inversiones 123',
    'Monto': 150000,
    'Tipo de pago': 'Cheque',
    'Vendedor': 'Carlos López'
  }
];

const wsAbonos = XLSX.utils.json_to_sheet(abonosData);
const wbAbonos = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbAbonos, wsAbonos, 'Abonos');
XLSX.writeFile(wbAbonos, 'EJEMPLO_ABONOS.xlsx');

console.log('✅ Archivo EJEMPLO_ABONOS.xlsx creado exitosamente');
