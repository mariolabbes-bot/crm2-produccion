console.log('Iniciando CRM2 Backend en modo:', process.env.NODE_ENV);
console.log('Valor de CORS_ORIGINS:', process.env.CORS_ORIGINS);
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Configuración de CORS para producción y desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir dominios de producción y desarrollo local
    const allowedOrigins = [
      'https://crm2-produccion.vercel.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    const normalize = o => (o || '').replace(/\/$/, '').toLowerCase();
    if (!origin || allowedOrigins.some(o => normalize(o) === normalize(origin))) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};

app.use(express.json());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rutas principales
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/activity-types', require('./routes/activity_types'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/goal-types', require('./routes/goal_types'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/threats', require('./routes/threats'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/kpis', require('./routes/kpis'));
app.use('/api/abonos', require('./routes/abonos'));
app.use('/api/comparativas', require('./routes/comparativas'));
app.use('/api/import', require('./routes/import'));
app.use('/api/diagnostico', require('./routes/diagnostico'));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CRM2 Backend API - Versión: 2024-11-12',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    corsOrigins: process.env.CORS_ORIGINS || 'default'
  });
});

// Endpoint temporal para depuración: muestra la cadena de conexión actual
app.get('/api/debug/dburl', (req, res) => {
  res.json({
    DATABASE_URL: process.env.DATABASE_URL || null
  });
});

// Middleware 404
app.use((req, res, next) => {
  res.status(404).json({ msg: 'Endpoint no encontrado' });
});

// Middleware para registrar errores
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ msg: 'Error interno del servidor', detail: err.message });
});

module.exports = app;