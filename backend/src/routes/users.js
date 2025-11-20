const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');

// User Registration (Manager only)
router.post('/register', auth('manager'), async (req, res) => {
  try {
    const { rut, nombre_completo, correo, password, rol_usuario, alias } = req.body;

    // Check if user exists
    const user = await pool.query('SELECT * FROM usuario WHERE correo = $1 OR alias = $2', [correo, alias]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = await pool.query(
      'INSERT INTO usuario (rut, nombre_completo, correo, password, rol_usuario, alias) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [rut, nombre_completo, correo, hashedPassword, rol_usuario, alias]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email }); // Log para depuración (sin password)

    // Check if user exists (buscar por correo, case-insensitive)
    const user = await pool.query('SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)', [email]);

    if (user.rows.length === 0) {
      console.log('No se encontró usuario con ese correo.');
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Verificar password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    console.log('Autenticación:', isMatch ? 'exitosa' : 'fallida');
    
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create and return token
    const payload = {
      user: {
        rut: user.rows[0].rut,
        alias: user.rows[0].alias,
        nombre: user.rows[0].nombre_completo,
        nombre_vendedor: user.rows[0].nombre_vendedor,
        rol: user.rows[0].rol_usuario
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }, // 24 horas
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            rut: user.rows[0].rut,
            nombre: user.rows[0].nombre_completo,
            correo: user.rows[0].correo,
            rol: user.rows[0].rol_usuario,
            alias: user.rows[0].alias,
            nombre_vendedor: user.rows[0].nombre_vendedor
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});


// Obtener todos los vendedores
router.get('/vendedores', async (req, res) => {
  try {
    // Primero verificar qué tabla existe
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('usuario', 'users')
    `);
    
    const tableNames = tableCheck.rows.map(r => r.table_name);
    console.log('📋 Tablas encontradas:', tableNames);
    
    // Determinar qué tabla usar
    let tableName = 'usuario';
    if (tableNames.includes('users')) {
      tableName = 'users';
    }
    
    console.log(`📋 Usando tabla: ${tableName}`);
    
    // Obtener columnas de la tabla
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
    `, [tableName]);
    
    const columnNames = columnsCheck.rows.map(r => r.column_name);
    console.log('📋 Columnas disponibles:', columnNames);
    
    // Construir query según columnas disponibles
    let query;
    if (tableName === 'users') {
      query = `
        SELECT 
          id,
          nombre_vendedor as nombre,
          email as correo,
          rol
        FROM users
        WHERE rol = 'VENDEDOR' OR rol = 'vendedor'
        ORDER BY nombre_vendedor ASC
      `;
    } else {
      query = `
        SELECT 
          id,
          nombre_vendedor as nombre,
          correo,
          rol_usuario as rol
        FROM usuario
        WHERE rol_usuario = 'VENDEDOR'
        ORDER BY nombre_completo ASC
      `;
    }
    
    const vendedores = await pool.query(query);
    console.log(`📋 Vendedores encontrados: ${vendedores.rows.length}`);
    res.json(vendedores.rows);
  } catch (err) {
    console.error('Error al obtener vendedores:', err.message);
    res.status(500).json({ 
      msg: 'Error al obtener vendedores', 
      error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message 
    });
  }
});

module.exports = router;
