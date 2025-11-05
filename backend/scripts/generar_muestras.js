const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function generarVentas() {
  const data = [
    {
      'Sucursal': 'Casa Matriz',
      'Tipo documento': 'Factura',
      'Folio': 'TST-1001',
      'Fecha': '2025-11-05',
      'Identificador': '11111111-1',
      'Cliente': 'CLIENTE PRUEBA UNO',
      'Vendedor cliente': 'jperez', // alias existente recomendado
      'Vendedor documento': 'Juan Perez',
      'Estado sistema': 'Vigente',
      'Estado comercial': 'Pagada',
      'Estado SII': 'Aceptada',
      'Indice': '1',
      'SKU': 'SKU-TEST-1',
      'Descripcion': 'Producto demo',
      'Cantidad': 2,
      'Precio': 15000,
      'Valor total': 30000
    }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  const outDir = path.join(__dirname, 'samples');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'ventas_ejemplo.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log('Archivo generado:', outPath);
}

function generarAbonos() {
  const data = [
    {
      'Sucursal': 'Casa Matriz',
      'Folio': 'AB-TST-1001',
      'Fecha': '2025-11-05',
      'Identificador': '11111111-1',
      'Cliente': 'CLIENTE PRUEBA UNO',
      'Vendedor cliente': 'jperez',
      'Caja operacion': 'Caja 1',
      'Usuario ingreso': 'admin',
      'Monto total': 30000,
      'Saldo a favor': 0,
      'Saldo a favor total': 0,
      'Tipo pago': 'Transferencia',
      'Estado abono': 'Aplicado',
      'Identificador abono': 'PAG-TST-1',
      'Fecha vencimiento': '2025-12-05',
      'Monto': 30000,
      'Monto neto': 30000
    }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Abonos');
  const outDir = path.join(__dirname, 'samples');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'abonos_ejemplo.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log('Archivo generado:', outPath);
}

if (require.main === module) {
  generarVentas();
  generarAbonos();
}

module.exports = { generarVentas, generarAbonos };
