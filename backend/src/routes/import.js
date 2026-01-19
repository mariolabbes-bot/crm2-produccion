const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { createJob, getJobStatus } = require('../services/importJobs');
const { enqueueImport } = require('../workers/importBullWorker');
const { parseExcelDate, parseNumeric } = require('../services/importers/utils');

// Asegurar directorios
const TEMP_DIR = 'uploads/temp';
const PENDING_DIR = 'uploads/pending';
const REPORTS_DIR = 'uploads/reports';
[TEMP_DIR, PENDING_DIR, REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({
  dest: TEMP_DIR + '/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.xlsm'].includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls, .xlsm)'));
  }
});

// Helper para mover archivo a pending con nombre único
const moveToPending = (req, jobId) => {
  const permanentPath = path.join(PENDING_DIR, `${jobId}_${req.file.originalname}`);
  fs.renameSync(req.file.path, permanentPath);
  return permanentPath;
};

// ==================== ENDPOINTS ASÍNCRONOS (WORKER) ====================

const {
  processVentasFileAsync,
  processAbonosFileAsync,
  processClientesFileAsync,
  processSaldoCreditoFileAsync
} = require('../services/importJobs');

// POST /ventas (Async/Sync)
router.post('/ventas', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟢 [Request] /ventas recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const forceSync = req.query.forceSync === 'true';

    const jobId = await createJob('ventas', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    if (forceSync) {
      console.log(`⚡ [Sync] Ejecutando ventas job ${jobId} sincrónicamente`);
      // Ejecutar directamente (bypass queue)
      const result = await processVentasFileAsync(jobId, permanentPath, req.file.originalname);
      return res.json({ success: true, jobId, status: 'completed', result });
    }

    // Async Queue
    await enqueueImport({
      jobId,
      type: 'ventas',
      filePath: permanentPath,
      originalName: req.file.originalname,
      userRut
    });

    res.status(202).json({
      success: true,
      jobId,
      msg: 'Archivo recibido. Procesando en segundo plano...',
      statusUrl: `/api/import/status/${jobId}`
    });
  } catch (error) {
    console.error('❌ Error /ventas:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, msg: 'Error al iniciar importación', error: error.message });
  }
});

// POST /abonos (Async/Sync)
router.post('/abonos', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🔵 [Request] /abonos recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const updateMissing = (req.query.updateMissing === '1' || req.query.updateMissing === 'true');
    const forceSync = req.query.forceSync === 'true';

    const jobId = await createJob('abonos', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    if (forceSync) {
      console.log(`⚡ [Sync] Ejecutando abonos job ${jobId} sincrónicamente`);
      const result = await processAbonosFileAsync(jobId, permanentPath, req.file.originalname, { updateMissing });
      return res.json({ success: true, jobId, status: 'completed', result });
    }

    await enqueueImport({
      jobId,
      type: 'abonos',
      filePath: permanentPath,
      originalName: req.file.originalname,
      userRut,
      options: { updateMissing }
    });

    res.status(202).json({
      success: true,
      jobId,
      msg: 'Archivo recibido. Procesando en segundo plano...',
      statusUrl: `/api/import/status/${jobId}`
    });

  } catch (error) {
    console.error('❌ Error /abonos:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, msg: 'Error al iniciar importación', error: error.message });
  }
});

// POST /clientes (Async/Sync)
router.post('/clientes', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟣 [Request] /clientes recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const forceSync = req.query.forceSync === 'true';

    const jobId = await createJob('clientes', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    if (forceSync) {
      console.log(`⚡ [Sync] Ejecutando clientes job ${jobId} sincrónicamente`);
      const result = await processClientesFileAsync(jobId, permanentPath, req.file.originalname);
      return res.json({ success: true, jobId, status: 'completed', result });
    }

    await enqueueImport({
      jobId,
      type: 'clientes',
      filePath: permanentPath,
      originalName: req.file.originalname,
      userRut
    });

    res.status(202).json({
      success: true,
      jobId,
      msg: 'Archivo recibido. Procesando en segundo plano...',
      statusUrl: `/api/import/status/${jobId}`
    });

  } catch (error) {
    console.error('❌ Error /clientes:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, msg: 'Error al iniciar importación', error: error.message });
  }
});

// POST /saldo-credito (Async/Sync)
router.post('/saldo-credito', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟢 [Request] /saldo-credito recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const forceSync = req.query.forceSync === 'true';

    const jobId = await createJob('saldo_credito', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    if (forceSync) {
      console.log(`⚡ [Sync] Ejecutando saldo-credito job ${jobId} sincrónicamente`);
      const result = await processSaldoCreditoFileAsync(jobId, permanentPath, req.file.originalname);
      return res.json({ success: true, jobId, status: 'completed', result });
    }

    await enqueueImport({
      jobId,
      type: 'saldo_credito',
      filePath: permanentPath,
      originalName: req.file.originalname,
      userRut
    });

    res.status(202).json({
      success: true,
      jobId,
      msg: 'Archivo de Saldo Crédito recibido. Procesando en segundo plano...',
      statusUrl: `/api/import/status/${jobId}`
    });

  } catch (error) {
    console.error('❌ Error /saldo-credito:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, msg: 'Error al iniciar importación de saldo crédito', error: error.message });
  }
});

// GET Reports
router.get('/download-report/:filename', auth(['manager']), (req, res) => {
  const filePath = path.join(REPORTS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, msg: 'Archivo no encontrado' });
  res.download(filePath, req.params.filename);
});

// Plantillas
router.get('/plantilla/ventas', (req, res) => {
  const ws = XLSX.utils.json_to_sheet([{ 'Sucursal': 'Central', 'Tipo documento': 'Factura', 'Folio': '100', 'Fecha': '2025-01-01', 'RUT': '1-9', 'Cliente': 'Ejemplo', 'Vendedor cliente': 'Ali', 'Vendedor documento': 'Ali', 'SKU': 'A01', 'Cantidad': 10, 'Precio': 1000, 'Total': 10000 }]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

router.get('/plantilla/abonos', (req, res) => {
  const ws = XLSX.utils.json_to_sheet([{ 'Folio': 'AB-1', 'Fecha': '2025-01-01', 'Monto Neto': 50000, 'Identificador': '1-9', 'Cliente': 'Ejemplo', 'Alias vendedor': 'Ali' }]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Abonos');
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

router.get('/plantilla/clientes', (req, res) => {
  const ws = XLSX.utils.json_to_sheet([{ 'RUT': '1-9', 'Nombre': 'Empresa X', 'Email': 'x@x.cl', 'Vendedor': 'Ali' }]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, msg: 'Archivo demasiado grande (máx 50MB)' });
  res.status(500).json({ success: false, msg: 'Error', error: err.message });
});

module.exports = router;
