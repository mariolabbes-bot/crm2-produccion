const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');

// User Registration (Manager only)
router.post('/register', auth('manager'), async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Check if user exists
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = await pool.query(
      'INSERT INTO users (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, hashedPassword, rol]
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
    console.log('Login attempt:', { email, password }); // Log para depuración

    // Check if user exists (buscar por nombre o email)
    const user = await pool.query('SELECT * FROM users WHERE nombre = $1 OR email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create and return token
    const payload = {
      user: {
        id: user.rows[0].id,
        rol: user.rows[0].rol
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 }, // 1 hour
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server Error');
  }
});


// Obtener todos los vendedores
router.get('/vendedores', async (req, res) => {
  try {
    // Busca el rol_id correspondiente a 'Vendedor'
    const rolRes = await pool.query("SELECT id FROM roles WHERE nombre = 'Vendedor'");
    if (rolRes.rows.length === 0) {
      return res.status(404).json({ msg: 'Rol Vendedor no encontrado' });
    }
    const rolId = rolRes.rows[0].id;

    // Busca todos los usuarios con ese rol_id
    const vendedores = await pool.query('SELECT id, nombre, email FROM users WHERE rol_id = $1', [rolId]);
    res.json(vendedores.rows);
  } catch (err) {
    console.error('Error al obtener vendedores:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
