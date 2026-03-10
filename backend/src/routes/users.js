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
        id: user.rows[0].id,
        rut: user.rows[0].rut,
        alias: user.rows[0].alias,
        nombre: user.rows[0].nombre_completo,
        nombre_vendedor: user.rows[0].nombre_vendedor,
        rol: user.rows[0].rol_usuario,
        features: user.rows[0].features
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
    console.log('📋 [GET /vendedores] Iniciando consulta de vendedores...');

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const query = `
      SELECT DISTINCT ON (u.rut)
        u.id,
        u.rut,
        u.nombre_vendedor as nombre,
        u.correo,
        u.rol_usuario as rol,
        u.alias
      FROM usuario u
      WHERE (LOWER(u.rol_usuario) = 'vendedor' OR LOWER(u.rol_usuario) = 'manager')
      AND (
        EXISTS (SELECT 1 FROM venta v WHERE UPPER(TRIM(v.vendedor_cliente)) = UPPER(TRIM(u.nombre_vendedor)) LIMIT 1)
        OR EXISTS (SELECT 1 FROM venta v WHERE UPPER(TRIM(v.vendedor_documento)) = UPPER(TRIM(u.alias)) LIMIT 1)
      )
      AND u.nombre_vendedor IS NOT NULL
      AND (u.alias IS NULL OR u.alias NOT ILIKE '%_OLD')
      AND u.rut NOT ILIKE 'stub-%'
      ORDER BY u.rut, LOWER(TRIM(u.nombre_vendedor)) ASC
    `;

    const vendedores = await pool.query(query);
    console.log(`📋 ✓ Encontrados ${vendedores.rows.length} vendedores (unicos)`);

    res.json({
      success: true,
      data: vendedores.rows
    });
  } catch (err) {
    console.error('❌ Error al obtener vendedores:', err.message);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({
      msg: 'Error al obtener vendedores',
      error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
    });
  }
});

module.exports = router;
