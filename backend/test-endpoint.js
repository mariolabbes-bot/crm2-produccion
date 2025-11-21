const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

// Middleware auth
const auth = () => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('❌ No authorization header');
    return res.status(401).json({ msg: 'No token' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ No token in header');
    return res.status(401).json({ msg: 'No token' });
  }
  
  try {
    const secret = process.env.JWT_SECRET || 'tu_secreto_jwt';
    req.user = jwt.verify(token, secret);
    console.log('✅ Usuario autenticado:', req.user.nombre_vendedor || req.user.alias);
    next();
  } catch (err) {
    console.log('❌ Token inválido:', err.message);
    res.status(401).json({ msg: 'Token inválido' });
  }
};

// Endpoint top-ventas
app.get('/api/clients/top-ventas', auth(), async (req, res) => {
  try {
    console.log('\n📊 GET /api/clients/top-ventas');
    const user = req.user;
    const isManager = user.rol?.toLowerCase() === 'manager';
    console.log('Usuario:', user.nombre_vendedor || user.alias, '- Rol:', user.rol);
    
    let vendedorFilter = '';
    let params = [];
    
    if (!isManager) {
      const nombreVendedor = user.nombre_vendedor || user.alias || '';
      if (nombreVendedor) {
        vendedorFilter = 'AND UPPER(v.vendedor_cliente) = UPPER($1)';
        params.push(nombreVendedor);
        console.log('Filtro vendedor:', nombreVendedor);
      }
    }
    
    const query = `
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.ciudad,
        c.telefono_principal as telefono,
        c.email,
        COALESCE(SUM(v.valor_total), 0) as total_ventas,
        COUNT(v.id) as cantidad_ventas
      FROM cliente c
      INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
      WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
      ${vendedorFilter}
      GROUP BY c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal, c.email
      ORDER BY total_ventas DESC
      LIMIT 20
    `;
    
    console.log('Ejecutando query...');
    const result = await pool.query(query, params);
    console.log(`✅ Encontrados ${result.rows.length} clientes`);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error en top-ventas:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Error al obtener top clientes', 
      error: err.message 
    });
  }
});

// Generar token de prueba
const testToken = jwt.sign(
  { 
    rut: '18424992-4', 
    rol: 'manager', 
    nombre_vendedor: 'MARIO ALBERTO LABBES' 
  }, 
  process.env.JWT_SECRET || 'tu_secreto_jwt', 
  { expiresIn: '1h' }
);

const server = app.listen(3002, () => {
  console.log('\n✅ Test server en http://localhost:3002');
  console.log('\nPrueba con:');
  console.log(`curl -H "Authorization: Bearer ${testToken}" http://localhost:3002/api/clients/top-ventas`);
  console.log('\nPresiona Ctrl+C para detener\n');
});

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  server.close();
  pool.end();
  process.exit(0);
});
