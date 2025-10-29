const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Configuración de multer para uploads temporales
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

// Utilidades compartidas
function norm(s) {
  return (s == null ? '' : String(s))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && !isNaN(value)) {
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, '0');
      const mm = String(m[2]).padStart(2, '0');
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  return null;
}

// POST /api/import/ventas - Importar ventas desde Excel
router.post('/ventas', auth(['manager']), upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });
    }

    console.log('📁 Procesando archivo:', req.file.originalname);
    
    // Leer Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Primera hoja
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    console.log(`📊 Total filas en Excel: ${data.length}`);

    // Detectar columnas
    const headers = Object.keys(data[0] || {});
    const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
    
    const colFolio = findCol([/^Folio$/i]);
    const colIdentificador = findCol([/^Identificador$/i]);
    const colFecha = findCol([/Fecha/i]);
    const colCliente = findCol([/^Cliente$/i]);
    const colVendedor = findCol([/^Vendedor documento$/i, /^Vendedor cliente$/i, /^Vendedor$/i]);
    const colCantidad = findCol([/^Cantidad$/i]);
    const colPrecio = findCol([/^Precio( Unitario)?$/i]);

    if (!colFolio || !colIdentificador || !colFecha || !colCliente) {
      throw new Error('Faltan columnas requeridas en el Excel (Folio, Identificador, Fecha, Cliente)');
    }

    // Cargar usuarios existentes
    const usersRes = await client.query("SELECT id, nombre FROM usuario WHERE rol = 'vendedor'");
    const usersByNormName = new Map(usersRes.rows.map(u => [norm(u.nombre), u.id]));

    // Cargar clientes existentes
    const clientsRes = await client.query("SELECT id, nombre, rut FROM cliente");
    const clientsByRut = new Map(clientsRes.rows.filter(c => c.rut).map(c => [norm(c.rut), c.id]));
    const clientsByName = new Map(clientsRes.rows.map(c => [norm(c.nombre), c.id]));

    // Verificar duplicados existentes (por folio + identificador)
    const existingSales = await client.query(
      "SELECT folio, tipo_documento FROM sales WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
    );
    const existingKeys = new Set(
      existingSales.rows.map(s => `${norm(s.tipo_documento)}|${norm(s.folio)}`)
    );

    // Procesar filas
    const toImport = [];
    const duplicates = [];
    const missingVendors = new Set();
    const missingClients = new Set();

    for (const row of data) {
      const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
      const tipoDoc = row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
      const fecha = parseExcelDate(row[colFecha]);
      const clienteNombre = row[colCliente] ? String(row[colCliente]).trim() : null;
      const vendedorNombre = colVendedor && row[colVendedor] ? String(row[colVendedor]).trim() : null;
      const cantidad = row[colCantidad] ? parseFloat(row[colCantidad]) : 0;
      const precio = row[colPrecio] ? parseFloat(row[colPrecio]) : 0;
      const total = cantidad * precio;

      if (!folio || !tipoDoc || !fecha || !clienteNombre) continue;

      // Validar duplicado
      const key = `${norm(tipoDoc)}|${norm(folio)}`;
      if (existingKeys.has(key)) {
        duplicates.push({ folio, tipoDoc, cliente: clienteNombre });
        continue;
      }

      // Buscar vendedor
      let vendedorId = null;
      if (vendedorNombre) {
        vendedorId = usersByNormName.get(norm(vendedorNombre));
        if (!vendedorId) {
          missingVendors.add(vendedorNombre);
        }
      }

      // Buscar cliente
      let clienteId = null;
      // Intentar por RUT primero (si el nombre parece RUT)
      if (/^\d{7,8}-[\dkK]$/.test(clienteNombre)) {
        clienteId = clientsByRut.get(norm(clienteNombre));
      }
      // Si no, buscar por nombre
      if (!clienteId) {
        clienteId = clientsByName.get(norm(clienteNombre));
      }
      if (!clienteId) {
        missingClients.add(clienteNombre);
      }

      toImport.push({
        folio,
        tipoDoc,
        fecha,
        clienteNombre,
        clienteId,
        vendedorNombre,
        vendedorId,
        total
      });
    }

    // Generar informe de faltantes si hay
    let pendingReportPath = null;
    if (missingVendors.size > 0 || missingClients.size > 0) {
      const reportWB = XLSX.utils.book_new();
      
      if (missingVendors.size > 0) {
        const vendorData = Array.from(missingVendors).map(v => ({
          'Nombre Vendedor': v,
          'Email': '',
          'Rol': 'vendedor'
        }));
        const vendorWS = XLSX.utils.json_to_sheet(vendorData);
        XLSX.utils.book_append_sheet(reportWB, vendorWS, 'Vendedores Faltantes');
      }

      if (missingClients.size > 0) {
        const clientData = Array.from(missingClients).map(c => ({
          'Nombre o RUT': c,
          'Nombre Completo': '',
          'RUT': '',
          'Email': '',
          'Teléfono': '',
          'Dirección': ''
        }));
        const clientWS = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(reportWB, clientWS, 'Clientes Faltantes');
      }

      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      pendingReportPath = path.join(reportDir, `faltantes_${Date.now()}.xlsx`);
      XLSX.writeFile(reportWB, pendingReportPath);
    }

    // Resultado
    const result = {
      success: true,
      totalRows: data.length,
      toImport: toImport.length,
      duplicates: duplicates.length,
      duplicatesList: duplicates.slice(0, 10), // Primeros 10
      missingVendors: Array.from(missingVendors),
      missingClients: Array.from(missingClients),
      pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
      canProceed: missingVendors.size === 0 && missingClients.size === 0
    };

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json(result);

  } catch (error) {
    console.error('❌ Error en importación:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      msg: 'Error al procesar archivo', 
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// POST /api/import/abonos - Importar abonos desde Excel
router.post('/abonos', auth(['manager']), upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });
    }

    console.log('📁 Procesando archivo abonos:', req.file.originalname);
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    console.log(`📊 Total filas: ${data.length}`);

    // Detectar columnas
    const headers = Object.keys(data[0] || {});
    const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
    
    const colFolio = findCol([/^Folio$/i]);
    const colFecha = findCol([/^Fecha$/i]);
    const colCliente = findCol([/^Cliente$/i]);
    const colMonto = findCol([/^Monto$/i, /^Total$/i]);
    const colTipoPago = findCol([/^Tipo.*pago$/i, /^Forma.*pago$/i]);
    const colVendedor = findCol([/^Vendedor$/i]);

    if (!colFolio || !colFecha || !colMonto) {
      throw new Error('Faltan columnas requeridas (Folio, Fecha, Monto)');
    }

    // Cargar vendedores y clientes
    const usersRes = await client.query("SELECT id, nombre FROM usuario WHERE rol = 'vendedor'");
    const usersByNormName = new Map(usersRes.rows.map(u => [norm(u.nombre), u.id]));

    const clientsRes = await client.query("SELECT id, nombre FROM cliente");
    const clientsByName = new Map(clientsRes.rows.map(c => [norm(c.nombre), c.id]));

    // Detectar tabla de abonos
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('abonos', 'abono')
      LIMIT 1
    `);
    const abonosTable = tableCheck.rows[0]?.table_name || 'abono';

    // Verificar duplicados por folio
    const existingAbonos = await client.query(`SELECT folio FROM ${abonosTable} WHERE folio IS NOT NULL`);
    const existingFolios = new Set(existingAbonos.rows.map(a => norm(a.folio)));

    const toImport = [];
    const duplicates = [];
    const missingVendors = new Set();
    const missingClients = new Set();

    for (const row of data) {
      const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
      const fecha = parseExcelDate(row[colFecha]);
      const monto = row[colMonto] ? parseFloat(row[colMonto]) : 0;
      const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
      const vendedorNombre = colVendedor && row[colVendedor] ? String(row[colVendedor]).trim() : null;
      const tipoPago = colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null;

      if (!folio || !fecha || monto <= 0) continue;

      // Validar duplicado
      if (existingFolios.has(norm(folio))) {
        duplicates.push({ folio, fecha, monto });
        continue;
      }

      // Buscar vendedor
      let vendedorId = null;
      if (vendedorNombre) {
        vendedorId = usersByNormName.get(norm(vendedorNombre));
        if (!vendedorId) missingVendors.add(vendedorNombre);
      }

      // Buscar cliente
      let clienteId = null;
      if (clienteNombre) {
        clienteId = clientsByName.get(norm(clienteNombre));
        if (!clienteId) missingClients.add(clienteNombre);
      }

      toImport.push({
        folio,
        fecha,
        monto,
        clienteNombre,
        clienteId,
        vendedorNombre,
        vendedorId,
        tipoPago
      });
    }

    // Generar informe de faltantes
    let pendingReportPath = null;
    if (missingVendors.size > 0 || missingClients.size > 0) {
      const reportWB = XLSX.utils.book_new();
      
      if (missingVendors.size > 0) {
        const vendorData = Array.from(missingVendors).map(v => ({
          'Nombre Vendedor': v,
          'Email': '',
          'Rol': 'vendedor'
        }));
        const vendorWS = XLSX.utils.json_to_sheet(vendorData);
        XLSX.utils.book_append_sheet(reportWB, vendorWS, 'Vendedores Faltantes');
      }

      if (missingClients.size > 0) {
        const clientData = Array.from(missingClients).map(c => ({
          'Nombre': c,
          'RUT': '',
          'Email': '',
          'Teléfono': ''
        }));
        const clientWS = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(reportWB, clientWS, 'Clientes Faltantes');
      }

      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      pendingReportPath = path.join(reportDir, `faltantes_abonos_${Date.now()}.xlsx`);
      XLSX.writeFile(reportWB, pendingReportPath);
    }

    const result = {
      success: true,
      totalRows: data.length,
      toImport: toImport.length,
      duplicates: duplicates.length,
      duplicatesList: duplicates.slice(0, 10),
      missingVendors: Array.from(missingVendors),
      missingClients: Array.from(missingClients),
      pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
      canProceed: missingVendors.size === 0 && missingClients.size === 0
    };

    fs.unlinkSync(req.file.path);
    res.json(result);

  } catch (error) {
    console.error('❌ Error en importación abonos:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      msg: 'Error al procesar archivo', 
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// GET /api/import/download-report/:filename - Descargar informe de faltantes
router.get('/download-report/:filename', auth(['manager']), (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join('uploads/reports', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, msg: 'Archivo no encontrado' });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error al descargar:', err);
    }
    // Opcionalmente eliminar el archivo después de descargarlo
    // fs.unlinkSync(filePath);
  });
});

// GET /api/import/plantilla/ventas - Descargar plantilla de ventas
router.get('/plantilla/ventas', (req, res) => {
  const sampleData = [
    {
      'Folio': '12345',
      'Identificador': 'Factura',
      'Fecha': '2025-01-15',
      'Cliente': 'EMPRESA EJEMPLO SPA',
      'Vendedor documento': 'Juan Pérez',
      'Cantidad': 10,
      'Precio': 5000
    },
    {
      'Folio': '12346',
      'Identificador': 'Boleta',
      'Fecha': '2025-01-16',
      'Cliente': '12345678-9',
      'Vendedor documento': 'María González',
      'Cantidad': 5,
      'Precio': 8000
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Ventas.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// GET /api/import/plantilla/abonos - Descargar plantilla de abonos
router.get('/plantilla/abonos', (req, res) => {
  const sampleData = [
    {
      'Folio': 'AB-001',
      'Fecha': '2025-01-20',
      'Cliente': 'EMPRESA EJEMPLO SPA',
      'Monto': 25000,
      'Tipo de pago': 'Transferencia',
      'Vendedor': 'Juan Pérez'
    },
    {
      'Folio': 'AB-002',
      'Fecha': '2025-01-21',
      'Cliente': 'CLIENTE DOS LTDA',
      'Monto': 50000,
      'Tipo de pago': 'Cheque',
      'Vendedor': 'María González'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Abonos');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Abonos.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
