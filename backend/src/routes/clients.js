const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

// GET clients (all for manager, own for vendedor)
router.get('/', auth(), async (req, res) => {
  try {
    let result;
    if (req.user.rol === 'manager') {
      result = await pool.query('SELECT c.*, u.nombre as vendedor_nombre FROM clients c JOIN users u ON c.vendedor_id = u.id ORDER BY c.id ASC');
    } else {
      result = await pool.query('SELECT c.*, u.nombre as vendedor_nombre FROM clients c JOIN users u ON c.vendedor_id = u.id WHERE c.vendedor_id = $1 ORDER BY c.id ASC', [req.user.id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET a single client by ID
router.get('/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    let result;
    if (req.user.rol === 'manager') {
        result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    } else {
        result = await pool.query('SELECT * FROM clients WHERE id = $1 AND vendedor_id = $2', [id, req.user.id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CREATE a new client with geocoding
router.post('/', auth(), async (req, res) => {
  try {
    const { rut, nombre, direccion, ciudad, estado, codigo_postal, pais, telefono, email } = req.body;
    
    let latitud = null;
    let longitud = null;

    const fullAddress = `${direccion}, ${ciudad}, ${estado}, ${codigo_postal}, ${pais}`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey && direccion) {
        try {
            const geoResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: fullAddress,
                    key: apiKey
                }
            });
    
            if (geoResponse.data.status === 'OK') {
                const location = geoResponse.data.results[0].geometry.location;
                latitud = location.lat;
                longitud = location.lng;
            }
        } catch (geoErr) {
            console.error('Geocoding failed:', geoErr.message);
            // Non-blocking error, we still save the client
        }
    }

    const newClient = await pool.query(
      'INSERT INTO clients (rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, vendedor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, req.user.id]
    );
    res.status(201).json(newClient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// BULK CREATE new clients (Geocoding not implemented for bulk)
router.post('/bulk', auth(), async (req, res) => {
  const clients = req.body;

  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({ msg: 'Please provide a list of clients.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertedClients = [];
    for (const c of clients) {
      // Note: Geocoding is skipped for bulk inserts to avoid hitting API limits quickly.
      // You might want to implement a batch geocoding strategy or a queue system for this.
      const { rut, nombre, direccion, telefono, email } = c;
      const newClient = await client.query(
        'INSERT INTO clients (rut, nombre, direccion, telefono, email, vendedor_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [rut, nombre, direccion, telefono, email, req.user.id]
      );
      insertedClients.push(newClient.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(insertedClients);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// UPDATE a client
router.put('/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    // Note: Geocoding on update is not implemented yet.
    const { nombre, direccion, telefono, email } = req.body;
    
    let updatedClient;
    if (req.user.rol === 'manager') {
        updatedClient = await pool.query(
            'UPDATE clients SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 RETURNING *',
            [nombre, direccion, telefono, email, id]
        );
    } else {
        updatedClient = await pool.query(
            'UPDATE clients SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 AND vendedor_id = $6 RETURNING *',
            [nombre, direccion, telefono, email, id, req.user.id]
        );
    }

    if (updatedClient.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(updatedClient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE a client
router.delete('/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    let deleteOp;
    if (req.user.rol === 'manager') {
        deleteOp = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    } else {
        deleteOp = await pool.query('DELETE FROM clients WHERE id = $1 AND vendedor_id = $2 RETURNING *', [id, req.user.id]);
    }

    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json({ msg: 'Client deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;