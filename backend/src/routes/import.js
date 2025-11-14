const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { createJob, updateJobStatus, getJobStatus, processVentasFileAsync } = require('../services/importJobs');

// Asegurar directorios de trabajo para uploads temporales y reportes
const TEMP_DIR = 'uploads/temp';
try {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (e) {
  console.error('No se pudo crear el directorio de temporales:', TEMP_DIR, e);
}

// Configuración de multer para uploads temporales
const upload = multer({
  dest: TEMP_DIR + '/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls, .xlsm)'));
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

// POST /api/import/ventas - Importar ventas desde Excel (ASÍNCRONO)
router.post('/ventas', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟢 ====== ENDPOINT /ventas LLAMADO ====== 🟢');
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });
    }

    console.log('📁 [ASYNC] Archivo recibido:', req.file.originalname);

    // Crear job y mover archivo a ubicación permanente temporal
    const userRut = req.user?.rut || 'unknown';
    const jobId = await createJob('ventas', req.file.originalname, userRut);
    
    const permanentPath = path.join('uploads/pending', `${jobId}_${req.file.originalname}`);
    const pendingDir = 'uploads/pending';
    if (!fs.existsSync(pendingDir)) fs.mkdirSync(pendingDir, { recursive: true });
    fs.renameSync(req.file.path, permanentPath);

    // Responder inmediatamente con 202 Accepted
    res.status(202).json({
      success: true,
      jobId,
      msg: 'Archivo recibido. Procesando en segundo plano...',
      statusUrl: `/api/import/status/${jobId}`
    });

    // Procesar archivo en background (no await)
    processVentasFileAsync(jobId, permanentPath, req.file.originalname)
      .then(() => {
        console.log(`✅ [Job ${jobId}] Completado exitosamente`);
      })
      .catch(err => {
        console.error(`❌ [Job ${jobId}] Falló:`, err.message);
      });

  } catch (error) {
    console.error('❌ Error al crear job:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      msg: 'Error al iniciar importación', 
      error: error.message
    });
  }
});

// GET /api/import/status/:jobId - Obtener estado de importación
router.get('/status/:jobId', auth(['manager']), async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ success: false, msg: 'Job no encontrado' });
    }

    const response = {
      success: true,
      jobId: job.job_id,
      tipo: job.tipo,
      filename: job.filename,
      status: job.status,
      createdAt: job.created_at,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      totalRows: job.total_rows,
      importedRows: job.imported_rows,
      duplicateRows: job.duplicate_rows,
      errorRows: job.error_rows,
      errorMessage: job.error_message
    };

    // Si está completado, incluir el resultado completo
    if (job.status === 'completed' && job.result_data) {
      response.result = job.result_data;
    }

    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener status:', error);
    res.status(500).json({ success: false, msg: 'Error al obtener estado', error: error.message });
  }
});

// POST /api/import/abonos - Importar abonos desde Excel
router.post('/abonos', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🔵 ====== ENDPOINT /abonos LLAMADO ====== 🔵');
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
    if (!Array.isArray(data) || data.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, msg: 'El archivo Excel no contiene filas para procesar' });
    }

    // Detectar columnas
    const headers = Object.keys(data[0] || {});
    console.log('🔎 Encabezados detectados (abonos):', headers);
    const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
    
    // Columnas REQUERIDAS para abonos
    const colFolio = findCol([/^Folio$/i, /Folio/i]);
    const colFecha = findCol([/^Fecha$/i, /Fecha.*abono/i, /Fecha/i]);
    const colMontoNeto = findCol([/^Monto.*neto$/i, /Monto.*neto/i]); // ← COLUMNA PRINCIPAL
    
    console.log('📋 Columnas requeridas detectadas (ABONOS):');
    console.log('  - Folio:', colFolio);
    console.log('  - Fecha:', colFecha);
    console.log('  - Monto Neto:', colMontoNeto);

    if (!colFolio || !colFecha || !colMontoNeto) {
      const faltantes = [
        !colFolio ? 'Folio' : null,
        !colFecha ? 'Fecha' : null,
        !colMontoNeto ? 'Monto Neto' : null
      ].filter(Boolean);
      console.error('❌ Faltan columnas:', faltantes);
      console.error('❌ Encabezados disponibles:', headers);
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        msg: `Faltan columnas requeridas: ${faltantes.join(', ')}`,
        detalles: { 
          encabezadosDetectados: headers,
          columnasRequeridas: ['Folio', 'Fecha', 'Monto Neto']
        }
      });
    }

    // Columnas OPCIONALES
    const colSucursal = findCol([/^Sucursal$/i]);
    const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
    const colCliente = findCol([/^Cliente$/i]);
    // Vendedor: buscar por varios nombres posibles (priorizar Alias)
    const colVendedorCliente = findCol([
      /^Alias.*vendedor$/i,      // "Alias Vendedor"
      /^Alias.*Vende[cd]$/i,     // "Alias Vendec", "Alias Vended"
      /^Vendedor.*cliente$/i,     // "Vendedor cliente"
      /^Vendedor$/i               // "Vendedor"
    ]);
    const colCajaOperacion = findCol([/^Caja.*operacion$/i]);
    const colUsuarioIngreso = findCol([/^Usuario.*ingreso$/i]);
    const colMonto = findCol([/^Monto$/i, /Monto.*abono/i]); // Monto sin "neto" ni "total"
    const colMontoTotal = findCol([/^Monto.*total$/i]);
    const colSaldoFavor = findCol([/^Saldo.*favor$/i]);
    const colSaldoFavorTotal = findCol([/^Saldo.*favor.*total$/i]);
    const colTipoPago = findCol([/^Tipo.*pago$/i]);
    const colEstadoAbono = findCol([/^Estado.*abono$/i]);
    const colIdentificadorAbono = findCol([/^Identificador.*abono$/i]);
    const colFechaVencimiento = findCol([/^Fecha.*vencimiento$/i]);

    console.log('📋 Columnas opcionales detectadas:');
    console.log('  - Sucursal:', colSucursal);
    console.log('  - Identificador:', colIdentificador);
    console.log('  - Cliente:', colCliente);
    console.log('  - Vendedor Cliente:', colVendedorCliente);
    console.log('  - Monto:', colMonto);
    console.log('  - Monto Total:', colMontoTotal);

    // Cargar usuarios (con matching flexible igual que en ventas)
  // Cargar TODOS los usuarios que tengan nombre_vendedor, independiente del rol (incluye MANAGER con funciones de venta)
  const usersRes = await client.query("SELECT nombre_vendedor, rut FROM usuario WHERE nombre_vendedor IS NOT NULL");
    
    console.log(`👥 Vendedores cargados: ${usersRes.rows.length}`);
    usersRes.rows.forEach(u => {
      console.log(`   - ${u.rut}: "${u.nombre_vendedor}"`);
    });
    
    // Crear 3 mapas de búsqueda para matching flexible (IGUAL QUE EN VENTAS)
    const usersByNormFull = new Map();
    const usersByFirstTwo = new Map();
    const usersByFirstWord = new Map();
    
    usersRes.rows.filter(u => u.nombre_vendedor).forEach(u => {
      const fullNorm = norm(u.nombre_vendedor);
      const words = fullNorm.split(/\s+/).filter(w => w.length > 0);
      
      // Mapa 1: Nombre completo normalizado → GUARDA NOMBRE_VENDEDOR (no RUT)
      usersByNormFull.set(fullNorm, u.nombre_vendedor);
      
      // Mapa 2: Primeras dos palabras → GUARDA NOMBRE_VENDEDOR (no RUT)
      if (words.length >= 2) {
        const firstTwo = words.slice(0, 2).join(' ');
        if (!usersByFirstTwo.has(firstTwo)) {
          usersByFirstTwo.set(firstTwo, u.nombre_vendedor);
        }
      }
      
      // Mapa 3: Primera palabra → GUARDA NOMBRE_VENDEDOR (no RUT)
      if (words.length >= 1) {
        const firstWord = words[0];
        if (!usersByFirstWord.has(firstWord)) {
          usersByFirstWord.set(firstWord, u.nombre_vendedor);
        }
      }
    });
    
    console.log(`🗺️  Mapa primera palabra: ${Array.from(usersByFirstWord.keys()).join(', ')}`);

    // Cargar clientes (por RUT y por nombre)
    const clientsRes = await client.query("SELECT rut, nombre FROM cliente");
    const clientsByRut = new Map(clientsRes.rows.map(c => [norm(c.rut), c.rut]));
    const clientsByName = new Map(clientsRes.rows.map(c => [norm(c.nombre), c.rut]));

    // Verificar duplicados: CLAVE ÚNICA = FOLIO + IDENTIFICADOR_ABONO + FECHA
    // (según constraint de BD: abono_unique_key)
    const existingAbonos = await client.query(`
      SELECT folio, fecha, identificador_abono 
      FROM abono 
      WHERE folio IS NOT NULL
    `);
    const existingKeys = new Set(
      existingAbonos.rows.map(a => {
        const f = norm(a.folio || '');
        const d = a.fecha || '';
        const ia = norm(a.identificador_abono || '');
        return `${f}|${d}|${ia}`;
      })
    );

  const toImport = [];
  const duplicates = [];
  const missingVendors = new Set();
  const missingClients = new Set();
  const observations = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const excelRow = i + 2;
      const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
      const fecha = parseExcelDate(row[colFecha]);
      const montoNeto = parseNumeric(row[colMontoNeto]); // ← VALOR PRINCIPAL

      if (!folio || !fecha || !montoNeto || montoNeto <= 0) continue;

      // Procesar datos primero para obtener identificador
      const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
      const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
      const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
      const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
      const cajaOperacion = colCajaOperacion && row[colCajaOperacion] ? String(row[colCajaOperacion]).trim() : null;
      const usuarioIngreso = colUsuarioIngreso && row[colUsuarioIngreso] ? String(row[colUsuarioIngreso]).trim() : null;
      const monto = colMonto ? parseNumeric(row[colMonto]) : null; // Monto secundario/opcional
      const montoTotal = colMontoTotal ? parseNumeric(row[colMontoTotal]) : null;
      const saldoFavor = colSaldoFavor ? parseNumeric(row[colSaldoFavor]) : null;
      const saldoFavorTotal = colSaldoFavorTotal ? parseNumeric(row[colSaldoFavorTotal]) : null;
      const tipoPago = colTipoPago && row[colTipoPago] ? String(row[colTipoPago]).trim() : null;
      const estadoAbono = colEstadoAbono && row[colEstadoAbono] ? String(row[colEstadoAbono]).trim() : null;
      const identificadorAbono = colIdentificadorAbono && row[colIdentificadorAbono] ? String(row[colIdentificadorAbono]).trim() : null;
      const fechaVencimiento = colFechaVencimiento ? parseExcelDate(row[colFechaVencimiento]) : null;

      // Validar duplicado DESPUÉS de tener identificadorAbono
      // CLAVE ÚNICA: FOLIO + IDENTIFICADOR_ABONO + FECHA (según constraint BD)
      const duplicateKey = `${norm(folio)}|${fecha}|${norm(identificadorAbono || '')}`;
      if (existingKeys.has(duplicateKey)) {
        duplicates.push({ folio, fecha, identificadorAbono, monto: montoNeto });
        continue;
      }

      // Buscar vendedor con matching flexible (IGUAL QUE EN VENTAS)
      let vendedorNombre = null;
      if (vendedorClienteAlias) {
        console.log(`🔍 [Fila ${excelRow}] Buscando vendedor: "${vendedorClienteAlias}"`);
        const vendorNorm = norm(vendedorClienteAlias);
        const vendorWords = vendorNorm.split(/\s+/).filter(w => w.length > 0);
        console.log(`   Normalizado: "${vendorNorm}", Palabras: [${vendorWords.join(', ')}]`);
        
        // Nivel 1: Nombre completo
        if (usersByNormFull.has(vendorNorm)) {
          vendedorNombre = usersByNormFull.get(vendorNorm);
          console.log(`   ✅ Match nivel 1 (completo): ${vendedorNombre}`);
        }
        // Nivel 2: Primeras dos palabras
        else if (vendorWords.length >= 2) {
          const firstTwo = vendorWords.slice(0, 2).join(' ');
          if (usersByFirstTwo.has(firstTwo)) {
            vendedorNombre = usersByFirstTwo.get(firstTwo);
            console.log(`   ✅ Match nivel 2 (dos palabras "${firstTwo}"): ${vendedorNombre}`);
          }
        }
        // Nivel 3: Primera palabra
        if (!vendedorNombre && vendorWords.length >= 1) {
          const firstWord = vendorWords[0];
          console.log(`   Intentando nivel 3 con primera palabra: "${firstWord}"`);
          if (usersByFirstWord.has(firstWord)) {
            vendedorNombre = usersByFirstWord.get(firstWord);
            console.log(`   ✅ Match nivel 3 (una palabra "${firstWord}"): ${vendedorNombre}`);
          } else {
            console.log(`   ❌ No encontrado en mapa de primera palabra`);
          }
        }
        
        // Si no se encontró, agregar a faltantes
        if (!vendedorNombre) {
          missingVendors.add(vendedorClienteAlias);
          observations.push({ fila: excelRow, folio, campo: 'vendedor_cliente', detalle: `Vendedor no encontrado: ${vendedorClienteAlias}` });
        }
      }

      // Buscar cliente por RUT
      let clienteRut = null;
      if (identificador && /^\d{7,8}-[\dkK]$/.test(identificador)) {
        const existe = clientsByRut.has(norm(identificador));
        if (existe) {
          clienteRut = identificador;
        }
      }
      if (!clienteRut && clienteNombre) {
        missingClients.add(clienteNombre);
        observations.push({ fila: excelRow, folio, campo: 'identificador', detalle: `Cliente no encontrado (${clienteNombre})` });
      }

      toImport.push({
        sucursal, folio, fecha, identificador: clienteRut, clienteNombre,
        vendedorClienteNombre: vendedorNombre, cajaOperacion, usuarioIngreso,
        montoTotal, saldoFavor, saldoFavorTotal, tipoPago,
        estadoAbono, identificadorAbono, fechaVencimiento,
        monto, montoNeto
      });
    }

    // Generar informe de faltantes
  let pendingReportPath = null;
  let observationsReportPath = null;
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
        const clientData = Array.from(missingClients).map(c => {
          const rutRegex = /^\d{7,8}-[\dkK]$/;
          return rutRegex.test(c)
            ? { 'RUT': c, 'Nombre': '', 'Email': '' }
            : { 'RUT': '', 'Nombre': c, 'Email': '' };
        });
        const clientWS = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(reportWB, clientWS, 'Clientes Faltantes');
      }

      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      pendingReportPath = path.join(reportDir, `faltantes_abonos_${Date.now()}.xlsx`);
      XLSX.writeFile(reportWB, pendingReportPath);
    }

    // Si todo está listo, ejecutar la importación
  const canProceed = true;
    let importedCount = 0;

    if (canProceed && toImport.length > 0) {
      console.log(`✅ Iniciando importación de ${toImport.length} abonos...`);
      
      try {
        // Inserciones independientes por fila (sin transacción global)
        for (let j = 0; j < toImport.length; j++) {
          const item = toImport[j];
          const excelRow = j + 2;
          try {
            await client.query(
            `INSERT INTO abono (
              sucursal, folio, fecha, identificador, cliente,
              vendedor_cliente, caja_operacion, usuario_ingreso,
              monto_total, saldo_a_favor, saldo_a_favor_total, tipo_pago,
              estado_abono, identificador_abono, fecha_vencimiento,
              monto, monto_neto
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
              [
                item.sucursal, item.folio, item.fecha, item.identificador, item.clienteNombre,
                item.vendedorClienteNombre, item.cajaOperacion, item.usuarioIngreso,
                item.montoTotal, item.saldoFavor, item.saldoFavorTotal, item.tipoPago,
                item.estadoAbono, item.identificadorAbono, item.fechaVencimiento,
                item.monto, item.montoNeto
              ]
            );
            importedCount++;
          } catch (err) {
            console.error(`❌ Error en fila Excel ${excelRow} (folio ${item.folio || 'N/A'}):`, err);
            observations.push({ fila: excelRow, folio: item.folio || null, campo: 'DB', detalle: err.detail || err.message });
          }
        }
        console.log(`✅ Importación finalizada: ${importedCount} abonos guardados, ${toImport.length - importedCount} con observaciones`);
      } catch (error) {
        console.error('❌ Error al guardar abonos:', error);
        observations.push({ fila: null, folio: null, campo: 'TRANSACCION', detalle: error.message });
      }
    }

    if (observations.length > 0) {
      const wbObs = XLSX.utils.book_new();
      const wsObs = XLSX.utils.json_to_sheet(observations.map(o => ({
        'Fila Excel': o.fila,
        'Folio': o.folio,
        'Campo': o.campo,
        'Detalle': o.detalle
      })));
      XLSX.utils.book_append_sheet(wbObs, wsObs, 'Observaciones');
      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      observationsReportPath = path.join(reportDir, `observaciones_abonos_${Date.now()}.xlsx`);
      XLSX.writeFile(wbObs, observationsReportPath);
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
      observationsReportUrl: observationsReportPath ? `/api/import/download-report/${path.basename(observationsReportPath)}` : null,
      canProceed: canProceed,
      dataImported: importedCount > 0
    };

    fs.unlinkSync(req.file.path);
    res.json(result);

  } catch (error) {
    console.error('❌ Error en importación abonos:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, msg: 'Error al procesar archivo', error: error.message });
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

// Manejador de errores específico para este router (multer y validaciones)
router.use((err, req, res, next) => {
  if (!err) return next();
  console.error('Error en /api/import:', err);
  // Tamaño excedido
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, msg: 'Archivo demasiado grande (máx 50MB)' });
  }
  // Error de formato de archivo / filtro
  if (err.message && /Solo se permiten archivos Excel/i.test(err.message)) {
    return res.status(400).json({ success: false, msg: err.message });
  }
  // Otro error genérico
  return res.status(500).json({ success: false, msg: 'Error al procesar archivo', error: err.message });
});
