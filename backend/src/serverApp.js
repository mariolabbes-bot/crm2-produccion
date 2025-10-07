require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Configuración de CORS para producción
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir sin origin (para herramientas como Postman)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002', 
      'https://tu-app.vercel.app',
      'https://crm2-frontend.vercel.app'
    ];
    
    // Agregar orígenes adicionales desde variable de entorno
    if (process.env.CORS_ORIGINS) {
      allowedOrigins.push(...process.env.CORS_ORIGINS.split(','));
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};

app.use(express.json());
app.use(cors(corsOptions));
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

app.get('/', (req, res) => {
  res.send('CRM2 Backend funcionando');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware 404
app.use((req, res, next) => {
  res.status(404).json({ msg: 'Endpoint no encontrado' });
});

// Middleware de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ msg: 'Error interno del servidor', detail: err.message });
});

module.exports = app;