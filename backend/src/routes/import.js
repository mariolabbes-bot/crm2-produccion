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

function parseNumeric(value) {
  if (value == null || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
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
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    console.log(`📊 Total filas en Excel: ${data.length}`);

    // Detectar columnas
    const headers = Object.keys(data[0] || {});
    const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
    
    // Columnas REQUERIDAS
    const colFolio = findCol([/^Folio$/i]);
    const colTipoDoc = findCol([/^Tipo.*documento$/i, /^Tipo$/i]);
    const colFecha = findCol([/^Fecha$/i, /^Fecha.*emision$/i]);
    
    // Columnas OPCIONALES
    const colSucursal = findCol([/^Sucursal$/i]);
    const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
    const colCliente = findCol([/^Cliente$/i]);
    const colVendedorCliente = findCol([/^Vendedor.*cliente$/i, /^Alias.*vendedor$/i]);
    const colVendedorDoc = findCol([/^Vendedor.*documento$/i, /^Vendedor$/i]);
    const colEstadoSistema = findCol([/^Estado.*sistema$/i]);
    const colEstadoComercial = findCol([/^Estado.*comercial$/i]);
    const colEstadoSII = findCol([/^Estado.*SII$/i, /^Estado.*sii$/i]);
    const colIndice = findCol([/^Indice$/i, /^Index$/i]);
    const colSKU = findCol([/^SKU$/i, /^Codigo$/i]);
    const colDescripcion = findCol([/^Descripcion$/i, /^Descripción$/i]);
    const colCantidad = findCol([/^Cantidad$/i]);
    const colPrecio = findCol([/^Precio$/i]);
    const colValorTotal = findCol([/^Valor.*total$/i, /^Total$/i]);

    if (!colFolio || !colTipoDoc || !colFecha) {
      throw new Error('Faltan columnas requeridas: Folio, Tipo documento, Fecha');
    }

    // Cargar usuarios existentes
    const usersRes = await client.query("SELECT id, nombre, alias FROM usuario WHERE rol = 'vendedor'");
    const usersByNormName = new Map(usersRes.rows.map(u => [norm(u.nombre), u.id]));
    const usersByNormAlias = new Map(usersRes.rows.filter(u => u.alias).map(u => [norm(u.alias), u.id]));

    // Cargar clientes existentes
    const clientsRes = await client.query("SELECT id, nombre, rut FROM cliente");
    const clientsByRut = new Map(clientsRes.rows.filter(c => c.rut).map(c => [norm(c.rut), c.id]));
    const clientsByName = new Map(clientsRes.rows.map(c => [norm(c.nombre), c.id]));

    // Verificar duplicados existentes (por tipo_documento + folio)
    const existingSales = await client.query(
      "SELECT folio, tipo_documento FROM venta WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
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
      const tipoDoc = row[colTipoDoc] ? String(row[colTipoDoc]).trim() : null;
      const fecha = parseExcelDate(row[colFecha]);

      if (!folio || !tipoDoc || !fecha) continue;

      // Validar duplicado
      const key = `${norm(tipoDoc)}|${norm(folio)}`;
      if (existingKeys.has(key)) {
        duplicates.push({ folio, tipoDoc, fecha });
        continue;
      }

      // Procesar datos
      const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
      const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
      const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
      const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
      const vendedorDocNombre = colVendedorDoc && row[colVendedorDoc] ? String(row[colVendedorDoc]).trim() : null;
      const estadoSistema = colEstadoSistema && row[colEstadoSistema] ? String(row[colEstadoSistema]).trim() : null;
      const estadoComercial = colEstadoComercial && row[colEstadoComercial] ? String(row[colEstadoComercial]).trim() : null;
      const estadoSII = colEstadoSII && row[colEstadoSII] ? String(row[colEstadoSII]).trim() : null;
      const indice = colIndice && row[colIndice] ? String(row[colIndice]).trim() : null;
      const sku = colSKU && row[colSKU] ? String(row[colSKU]).trim() : null;
      const descripcion = colDescripcion && row[colDescripcion] ? String(row[colDescripcion]).trim() : null;
      const cantidad = colCantidad ? parseNumeric(row[colCantidad]) : null;
      const precio = colPrecio ? parseNumeric(row[colPrecio]) : null;
      const valorTotal = colValorTotal ? parseNumeric(row[colValorTotal]) : null;

      // Buscar vendedor_id
      let vendedorId = null;
      if (vendedorClienteAlias) {
        vendedorId = usersByNormAlias.get(norm(vendedorClienteAlias));
        if (!vendedorId) missingVendors.add(vendedorClienteAlias);
      } else if (vendedorDocNombre) {
        vendedorId = usersByNormName.get(norm(vendedorDocNombre));
        if (!vendedorId) missingVendors.add(vendedorDocNombre);
      }

      // Buscar cliente_id (no requerido)
      let clienteId = null;
      if (identificador && /^\d{7,8}-[\dkK]$/.test(identificador)) {
        clienteId = clientsByRut.get(norm(identificador));
      } else if (clienteNombre) {
        clienteId = clientsByName.get(norm(clienteNombre));
      }

      toImport.push({
        sucursal,
        tipoDoc,
        folio,
        fecha,
        identificador,
        clienteNombre,
        vendedorClienteAlias,
        vendedorDocNombre,
        estadoSistema,
        estadoComercial,
        estadoSII,
        indice,
        sku,
        descripcion,
        cantidad,
        precio,
        valorTotal,
        vendedorId,
        clienteId
      });
    }

    // Generar informe de faltantes
    let pendingReportPath = null;
    if (missingVendors.size > 0 || missingClients.size > 0) {
      const reportWB = XLSX.utils.book_new();
      
      if (missingVendors.size > 0) {
        const vendorData = Array.from(missingVendors).map(v => ({
          'Nombre o Alias Vendedor': v,
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
          'Teléfono': ''
        }));
        const clientWS = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(reportWB, clientWS, 'Clientes Faltantes');
      }

      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      pendingReportPath = path.join(reportDir, `faltantes_${Date.now()}.xlsx`);
      XLSX.writeFile(reportWB, pendingReportPath);
    }

    // Si todo está listo, ejecutar la importación
    const canProceed = missingVendors.size === 0 && missingClients.size === 0;
    let importedCount = 0;

    if (canProceed && toImport.length > 0) {
      console.log(`✅ Iniciando importación de ${toImport.length} ventas...`);
      
      try {
        await client.query('BEGIN');

        for (const item of toImport) {
          await client.query(
            `INSERT INTO venta (
              sucursal, tipo_documento, folio, fecha_emision, identificador,
              cliente, vendedor_cliente, vendedor_documento,
              estado_sistema, estado_comercial, estado_sii, indice,
              sku, descripcion, cantidad, precio, valor_total, vendedor_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              item.sucursal, item.tipoDoc, item.folio, item.fecha, item.identificador,
              item.clienteNombre, item.vendedorClienteAlias, item.vendedorDocNombre,
              item.estadoSistema, item.estadoComercial, item.estadoSII, item.indice,
              item.sku, item.descripcion, item.cantidad, item.precio, item.valorTotal, item.vendedorId
            ]
          );
          importedCount++;
        }

        await client.query('COMMIT');
        console.log(`✅ Importación exitosa: ${importedCount} ventas guardadas`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al guardar en base de datos:', error);
        throw new Error(`Error al guardar datos: ${error.message}`);
      }
    }

    // Resultado
    const result = {
      success: true,
      totalRows: data.length,
      toImport: toImport.length,
      imported: importedCount,
      duplicates: duplicates.length,
      duplicatesList: duplicates.slice(0, 10),
      missingVendors: Array.from(missingVendors),
      missingClients: Array.from(missingClients),
      pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
      canProceed: canProceed,
      dataImported: canProceed && importedCount > 0
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
    
    // Columnas REQUERIDAS
    const colFolio = findCol([/^Folio$/i]);
    const colFecha = findCol([/^Fecha$/i]);
    const colMonto = findCol([/^Monto$/i]);
    
    // Columnas OPCIONALES
    const colSucursal = findCol([/^Sucursal$/i]);
    const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
    const colCliente = findCol([/^Cliente$/i]);
    const colVendedorCliente = findCol([/^Vendedor.*cliente$/i, /^Alias.*vendedor$/i]);
    const colCajaOperacion = findCol([/^Caja.*operacion$/i]);
    const colUsuarioIngreso = findCol([/^Usuario.*ingreso$/i]);
    const colMontoTotal = findCol([/^Monto.*total$/i]);
    const colSaldoFavor = findCol([/^Saldo.*favor$/i]);
    const colSaldoFavorTotal = findCol([/^Saldo.*favor.*total$/i]);
    const colTipoPago = findCol([/^Tipo.*pago$/i]);
    const colEstadoAbono = findCol([/^Estado.*abono$/i]);
    const colIdentificadorAbono = findCol([/^Identificador.*abono$/i]);
    const colFechaVencimiento = findCol([/^Fecha.*vencimiento$/i]);
    const colMontoNeto = findCol([/^Monto.*neto$/i]);

    if (!colFolio || !colFecha || !colMonto) {
      throw new Error('Faltan columnas requeridas: Folio, Fecha, Monto');
    }

    // Cargar usuarios
    const usersRes = await client.query("SELECT id, nombre, alias FROM usuario WHERE rol = 'vendedor'");
    const usersByNormAlias = new Map(usersRes.rows.filter(u => u.alias).map(u => [norm(u.alias), u.id]));

    // Cargar clientes
    const clientsRes = await client.query("SELECT id, nombre FROM cliente");
    const clientsByName = new Map(clientsRes.rows.map(c => [norm(c.nombre), c.id]));

    // Verificar duplicados
    const existingAbonos = await client.query(`SELECT folio FROM abono WHERE folio IS NOT NULL`);
    const existingFolios = new Set(existingAbonos.rows.map(a => norm(a.folio)));

    const toImport = [];
    const duplicates = [];
    const missingVendors = new Set();
    const missingClients = new Set();

    for (const row of data) {
      const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
      const fecha = parseExcelDate(row[colFecha]);
      const monto = colMonto ? parseNumeric(row[colMonto]) : null;

      if (!folio || !fecha || !monto || monto <= 0) continue;

      // Validar duplicado
      if (existingFolios.has(norm(folio))) {
        duplicates.push({ folio, fecha, monto });
        continue;
      }

      // Procesar datos
      const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
      const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
      const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
      const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
      const cajaOperacion = colCajaOperacion && row[colCajaOperacion] ? String(row[colCajaOperacion]).trim() : null;
      const usuarioIngreso = colUsuarioIngreso && row[colUsuarioIngreso] ? String(row[colUsuarioIngreso]).trim() : null;
      const montoTotal = colMontoTotal ? parseNumeric(row[colMontoTotal]) : null;
      const saldoFavor = colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : null;
      const saldoFavorTotal = colSaldoFavorTotal ? parseNumeric(row[colSaldoFavorTotal]) : null;
      const tipoPago = colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null;
      const estadoAbono = colEstadoAbono && row[colEstadoAbono] ? String(row[colEstadoAbono]).trim() : null;
      const identificadorAbono = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : null;
      const fechaVencimiento = colFechaVencimiento ? parseExcelDate(row[colFechaVencimiento]) : null;
      const montoNeto = colMontoNeto ? parseNumeric(row[colMontoNeto]) : null;

      // Buscar vendedor
      let vendedorId = null;
      if (vendedorClienteAlias) {
        vendedorId = usersByNormAlias.get(norm(vendedorClienteAlias));
        if (!vendedorId) missingVendors.add(vendedorClienteAlias);
      }

      // Buscar cliente
      let clienteId = null;
      if (clienteNombre) {
        clienteId = clientsByName.get(norm(clienteNombre));
        if (!clienteId) missingClients.add(clienteNombre);
      }

      toImport.push({
        sucursal, folio, fecha, identificador, clienteNombre,
        vendedorClienteAlias, cajaOperacion, usuarioIngreso,
        montoTotal, saldoFavor, saldoFavorTotal, tipoPago,
        estadoAbono, identificadorAbono, fechaVencimiento,
        monto, montoNeto, vendedorId, clienteId
      });
    }

    // Generar informe de faltantes
    let pendingReportPath = null;
    if (missingVendors.size > 0 || missingClients.size > 0) {
      const reportWB = XLSX.utils.book_new();
      
      if (missingVendors.size > 0) {
        const vendorData = Array.from(missingVendors).map(v => ({
          'Alias Vendedor': v,
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
          'Email': ''
        }));
        const clientWS = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(reportWB, clientWS, 'Clientes Faltantes');
      }

      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      pendingReportPath = path.join(reportDir, `faltantes_abonos_${Date.now()}.xlsx`);
      XLSX.writeFile(reportWB, pendingReportPath);
    }

    // Si todo está listo, ejecutar la importación
    const canProceed = missingVendors.size === 0 && missingClients.size === 0;
    let importedCount = 0;

    if (canProceed && toImport.length > 0) {
      console.log(`✅ Iniciando importación de ${toImport.length} abonos...`);
      
      try {
        await client.query('BEGIN');

        for (const item of toImport) {
          await client.query(
            `INSERT INTO abono (
              sucursal, folio, fecha, identificador, cliente,
              vendedor_cliente, caja_operacion, usuario_ingreso,
              monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago,
              estado_abono, identificador_abono, fecha_vencimiento,
              monto, monto_neto, vendedor_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              item.sucursal, item.folio, item.fecha, item.identificador, item.clienteNombre,
              item.vendedorClienteAlias, item.cajaOperacion, item.usuarioIngreso,
              item.montoTotal, item.saldoFavor, item.saldoFavorTotal, item.tipoPago,
              item.estadoAbono, item.identificadorAbono, item.fechaVencimiento,
              item.monto, item.montoNeto, item.vendedorId
            ]
          );
          importedCount++;
        }

        await client.query('COMMIT');
        console.log(`✅ Importación exitosa: ${importedCount} abonos guardados`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al guardar abonos:', error);
        throw new Error(`Error al guardar abonos: ${error.message}`);
      }
    }

    const result = {
      success: true,
      totalRows: data.length,
      toImport: toImport.length,
      imported: importedCount,
      duplicates: duplicates.length,
      duplicatesList: duplicates.slice(0, 10),
      missingVendors: Array.from(missingVendors),
      missingClients: Array.from(missingClients),
      pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
      canProceed: canProceed,
      dataImported: canProceed && importedCount > 0
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

// GET /api/import/download-report/:filename
router.get('/download-report/:filename', auth(['manager']), (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join('uploads/reports', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, msg: 'Archivo no encontrado' });
  }

  res.download(filePath, filename, (err) => {
    if (err) console.error('Error al descargar:', err);
  });
});

// GET /api/import/plantilla/ventas
router.get('/plantilla/ventas', (req, res) => {
  const sampleData = [
    {
      'Sucursal': 'Casa Matriz',
      'Tipo documento': 'Factura',
      'Folio': '12345',
      'Fecha': '2025-11-01',
      'Identificador': '12345678-9',
      'Cliente': 'EMPRESA EJEMPLO SPA',
      'Vendedor cliente': 'jperez',
      'Vendedor documento': 'Juan Pérez',
      'Estado sistema': 'Vigente',
      'Estado comercial': 'Pagada',
      'Estado SII': 'Aceptada',
      'Indice': '1',
      'SKU': 'PROD001',
      'Descripcion': 'Producto de ejemplo',
      'Cantidad': 10,
      'Precio': 5000,
      'Valor total': 50000
    },
    {
      'Sucursal': 'Sucursal Norte',
      'Tipo documento': 'Boleta',
      'Folio': '12346',
      'Fecha': '2025-11-02',
      'Identificador': '87654321-K',
      'Cliente': 'CLIENTE DOS LTDA',
      'Vendedor cliente': 'mgonzalez',
      'Vendedor documento': 'María González',
      'Estado sistema': 'Vigente',
      'Estado comercial': 'Pendiente',
      'Estado SII': 'Aceptada',
      'Indice': '1',
      'SKU': 'PROD002',
      'Descripcion': 'Otro producto',
      'Cantidad': 5,
      'Precio': 8000,
      'Valor total': 40000
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

// GET /api/import/plantilla/abonos
router.get('/plantilla/abonos', (req, res) => {
  const sampleData = [
    {
      'Sucursal': 'Casa Matriz',
      'Folio': 'AB-001',
      'Fecha': '2025-11-01',
      'Identificador': '12345678-9',
      'Cliente': 'EMPRESA EJEMPLO SPA',
      'Vendedor cliente': 'jperez',
      'Caja operacion': 'Caja 1',
      'Usuario ingreso': 'admin',
      'Monto total': 30000,
      'Saldo a favor': 0,
      'Saldo a favor total': 0,
      'Tipo pago': 'Transferencia',
      'Estado abono': 'Aplicado',
      'Identificador abono': 'PAG-001',
      'Fecha vencimiento': '2025-12-01',
      'Monto': 30000,
      'Monto neto': 30000
    },
    {
      'Sucursal': 'Sucursal Norte',
      'Folio': 'AB-002',
      'Fecha': '2025-11-02',
      'Identificador': '87654321-K',
      'Cliente': 'CLIENTE DOS LTDA',
      'Vendedor cliente': 'mgonzalez',
      'Caja operacion': 'Caja 2',
      'Usuario ingreso': 'admin',
      'Monto total': 50000,
      'Saldo a favor': 5000,
      'Saldo a favor total': 5000,
      'Tipo pago': 'Efectivo',
      'Estado abono': 'Aplicado',
      'Identificador abono': 'PAG-002',
      'Fecha vencimiento': '2025-12-02',
      'Monto': 50000,
      'Monto neto': 50000
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
