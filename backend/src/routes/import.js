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

// POST /ventas (Async)
router.post('/ventas', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟢 [Async] /ventas recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const jobId = await createJob('ventas', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    // Encolar job
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

// POST /abonos (Async)
router.post('/abonos', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🔵 [Async] /abonos recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const updateMissing = (req.query.updateMissing === '1' || req.query.updateMissing === 'true');

    // Crear Job y mover archivo
    const jobId = await createJob('abonos', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    // Encolar job con opciones
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

// POST /clientes (Async)
router.post('/clientes', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟣 [Async] /clientes recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    const jobId = await createJob('clientes', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

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

// GET /status/:jobId
router.get('/status/:jobId', auth(['manager']), async (req, res) => {
  try {
    const job = await getJobStatus(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, msg: 'Job no encontrado' });

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
    if (job.status === 'completed' && job.result_data) {
      response.result = job.result_data;
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, msg: 'Error al obtener estado', error: error.message });
  }
});

// ==================== ENDPOINTS SÍNCRONOS/LEGACY O PENDIENTES ====================

// POST /saldo-credito (SÍNCRONO - Destructivo)
// POST /saldo-credito (Async - Snapshot)
router.post('/saldo-credito', auth(['manager']), upload.single('file'), async (req, res) => {
  console.log('🟢 [Async] /saldo-credito recibido:', req.file?.originalname);
  try {
    if (!req.file) return res.status(400).json({ success: false, msg: 'No se proporcionó archivo' });

    const userRut = req.user?.rut || 'unknown';
    // Create Job
    const jobId = await createJob('saldo_credito', req.file.originalname, userRut);
    const permanentPath = moveToPending(req, jobId);

    // Enqueue
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
      msg: 'Archivo de Saldo Crédito recibido. Procesando en segundo plano (Snapshot Mode)...',
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
