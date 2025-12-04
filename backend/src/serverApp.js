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

// OPTIMIZACIÓN: Aumentar timeouts para importaciones grandes
// Render free tier puede necesitar hasta 30 minutos para 80k+ registros
app.use((req, res, next) => {
  // Aumentar timeout para rutas de importación (30 minutos = 1800s)
  if (req.path.includes('/import')) {
    req.setTimeout(1800000); // 30 minutos
    res.setTimeout(1800000);
  }
  next();
});

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
app.use('/api/import-stats', require('./routes/importStats')); // ← Nuevo endpoint
app.use('/api/diagnostico', require('./routes/diagnostico'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vendor-aliases', require('./routes/vendorAliases'));

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

// DEBUG: listar todas las rutas registradas
app.get('/api/debug/all-routes', (req, res) => {
  // Recorre el stack principal y también los routers montados para listar rutas completas.
  const routes = [];
  const stack = app._router.stack;
  stack.forEach(layer => {
    // Rutas directas (no montadas)
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      routes.push({ path: layer.route.path, methods });
    }
    // Routers montados (layer.name === 'router')
    else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      // Intentar derivar el path base desde la regexp del layer
      let base = '';
      if (layer.regexp && layer.regexp.source) {
        // Convierte la regexp en una ruta de montaje aproximada
        base = layer.regexp.source
          .replace(/^\^\\\//, '/')         // inicio ^\/
          .replace(/\/?\(\?=\\\/\|\$\)\$\/i/, '') // parte final opcional
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, '') // parámetros dinámicos (simplificación)
          .replace(/\\\//g, '/')           // barras escapadas
          .replace(/\^|\$/g, '')            // anchors
          .replace(/\/?\(\?=\/|$\)/, '') // trailing
          .trim();
        // Si queda algo como "/api/clients" seguido de basura, recortar a antes de (? o $.
        const idx = base.indexOf('(?');
        if (idx !== -1) base = base.substring(0, idx);
      }
      layer.handle.stack.forEach(sub => {
        if (sub.route && sub.route.path) {
          const methods = Object.keys(sub.route.methods).map(m => m.toUpperCase());
          routes.push({ path: `${base}${sub.route.path}`.replace(/\/+/g, '/'), methods });
        }
      });
    }
  });
  res.json({ total: routes.length, routes });
});

// DEBUG: columnas reales de tabla venta (global)
const { Pool } = require('pg');
let _pool;
function getPool() {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return _pool;
}

app.get('/api/debug/venta-columns', async (req, res) => {
  try {
    const q = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'venta' ORDER BY ordinal_position";
    const r = await getPool().query(q);
    res.json({ columns: r.rows });
  } catch (e) {
    console.error('❌ /api/debug/venta-columns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/debug/top-query', async (req, res) => {
  try {
    const q = `SELECT UPPER(TRIM(c.nombre)) as nombre, c.rut, COUNT(*) as ventas, SUM(v.valor_total) as total
               FROM cliente c INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
               WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
               GROUP BY c.rut, c.nombre
               ORDER BY total DESC
               LIMIT 5`;
    const r = await getPool().query(q);
    res.json(r.rows);
  } catch (e) {
    console.error('❌ /api/debug/top-query error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: columnas tabla usuario
app.get('/api/debug/usuario-columns', async (req, res) => {
  try {
    const q = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuario' ORDER BY ordinal_position";
    const r = await getPool().query(q);
    res.json({ columns: r.rows });
  } catch (e) {
    console.error('❌ /api/debug/usuario-columns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: columnas de tabla cliente
app.get('/api/debug/cliente-columns', async (req, res) => {
  try {
    const q = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cliente' ORDER BY ordinal_position";
    const r = await getPool().query(q);
    res.json({ columns: r.rows });
  } catch (e) {
    console.error('❌ /api/debug/cliente-columns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: columnas de tabla abono
app.get('/api/debug/abono-columns', async (req, res) => {
  try {
    const q = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'abono' ORDER BY ordinal_position";
    const r = await getPool().query(q);
    res.json({ columns: r.rows });
  } catch (e) {
    console.error('❌ /api/debug/abono-columns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: top ventas directo SIN auth (para aislar middleware auth)
app.get('/api/debug/top-ventas-direct', async (req, res) => {
  try {
    const q = `SELECT 
      c.rut,
      c.nombre,
      COALESCE(SUM(v.valor_total), 0) AS total_ventas,
      COUNT(*) AS cantidad_ventas
    FROM cliente c
    INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
    WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
    GROUP BY c.rut, c.nombre
    ORDER BY total_ventas DESC
    LIMIT 20`;
    const r = await getPool().query(q);
    res.json(r.rows);
  } catch (e) {
    console.error('❌ /api/debug/top-ventas-direct error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: valores únicos de vendedor_cliente en venta
app.get('/api/debug/vendedores-en-ventas', async (req, res) => {
  try {
    const q = `SELECT DISTINCT vendedor_cliente, COUNT(*) as cantidad_ventas
               FROM venta 
               WHERE fecha_emision >= NOW() - INTERVAL '12 months'
               GROUP BY vendedor_cliente 
               ORDER BY cantidad_ventas DESC 
               LIMIT 50`;
    const r = await getPool().query(q);
    res.json(r.rows);
  } catch (e) {
    console.error('❌ /api/debug/vendedores-en-ventas error:', e.message);
    res.status(500).json({ error: e.message });
  }
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