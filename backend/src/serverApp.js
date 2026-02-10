console.log('Iniciando CRM2 Backend en modo:', process.env.NODE_ENV);
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Configuración de CORS para producción y desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://crm2-produccion.vercel.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    // Permitir requests sin origin (como Postman o scripts locales)
    if (!origin) return callback(null, true);

    const normalize = o => (o || '').replace(/\/$/, '').toLowerCase();
    if (allowedOrigins.some(o => normalize(o) === normalize(origin)) || normalize(origin).endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Bloqueado: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};

app.use(express.json());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// OPTIMIZACIÓN: Aumentar timeouts para importaciones grandes
app.use((req, res, next) => {
  if (req.path.includes('/import')) {
    req.setTimeout(1800000); // 30 minutos
    res.setTimeout(1800000);
  }
  next();
});

// Rutas principales
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/client-detail', require('./routes/clientDetail'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/activity-types', require('./routes/activity_types'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/goal-types', require('./routes/goal_types'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/threats', require('./routes/threats'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/kpis', require('./routes/kpis'));
app.use('/api/abonos', require('./routes/abonos'));
app.use('/api/comparativas', require('./routes/comparativas'));
app.use('/api/import', require('./routes/import'));
app.use('/api/import-stats', require('./routes/importStats'));
app.use('/api/diagnostico', require('./routes/diagnostico'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vendor-aliases', require('./routes/vendorAliases'));
app.use('/api/products', require('./routes/products'));
app.use('/api/product-analytics', require('./routes/productAnalytics')); // Analítica de productos

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CRM2 Backend API v2.1',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

app.get('/api/test-db', async (req, res) => {
  const pool = require('./db');
  try {
    const v = await pool.query('SELECT count(*) as c, MAX(fecha_emision) as m FROM venta');
    const a = await pool.query('SELECT count(*) as c, MAX(fecha) as m FROM abono');
    res.json({ venta: v.rows[0], abono: a.rows[0], timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DB Debug endpoint (solo DB URL hash para verificar conexión, NO exponer credenciales)
app.get('/api/debug/connection-check', (req, res) => {
  // Solo permitir en desarrollo o para admin si se implementara middleware
  if (process.env.NODE_ENV === 'production') return res.status(403).send('Forbidden');
  res.json({ status: 'connected', db_configured: !!process.env.DATABASE_URL });
});

// Middleware 404
app.use((req, res, next) => {
  res.status(404).json({ msg: 'Endpoint no encontrado' });
});

// Middleware para registrar errores
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ msg: 'Error interno del servidor', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

module.exports = app;