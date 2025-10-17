console.log('Iniciando CRM2 Backend en modo:', process.env.NODE_ENV);
console.log('Valor de CORS_ORIGINS:', process.env.CORS_ORIGINS);
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Configuración de CORS para producción
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir todos los orígenes temporalmente para depuración
    callback(null, true);
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

// Middleware para registrar errores
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ msg: 'Error interno del servidor', detail: err.message });
});

module.exports = app;