const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

// GET top 20 clientes con mayor venta en últimos 12 meses pero sin ventas en el mes actual
router.get('/inactivos-mes-actual', auth(), async (req, res) => {
  try {
    // Detectar tabla y columnas de ventas
    const ventasTable = 'venta';
    const clienteCol = 'cliente';
    const fechaCol = 'fecha_emision';
    const vendedorCol = 'vendedor_id';
    const valorCol = 'valor_total';
    // Fechas
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const mesActualIni = `${year}-${String(month).padStart(2, '0')}-01`;
    const mesActualFin = new Date(year, month, 0); // último día del mes actual
    const mesActualFinStr = `${year}-${String(month).padStart(2, '0')}-${String(mesActualFin.getDate()).padStart(2, '0')}`;
    const hace12m = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const hace12mStr = `${hace12m.getFullYear()}-${String(hace12m.getMonth() + 1).padStart(2, '0')}-01`;

    // Query: top 20 clientes con mayor venta en últimos 12 meses, sin ventas en mes actual
    // Incluir monto total y promedio de ventas
    let vendedorFilter = '';
    const params = [hace12mStr, mesActualIni, mesActualFinStr];
    
    if (req.user.rol !== 'manager') {
      // Si no es manager, filtrar por su alias
      const userResult = await pool.query('SELECT alias FROM usuario WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0 && userResult.rows[0].alias) {
        vendedorFilter = ` AND c.vendedor_alias = $4`;
        params.push(userResult.rows[0].alias);
      }
    }
    
    const query = `
      WITH ventas_clientes AS (
        SELECT 
          c.rut, 
          c.nombre, 
          c.email, 
          c.telefono, 
          c.vendedor_alias,
          c.ciudad, 
          c.comuna,
          COALESCE(SUM(v.${valorCol}), 0) as monto_total,
          COALESCE(AVG(v.${valorCol}), 0) as monto_promedio,
          COUNT(DISTINCT v.folio) as num_ventas,
          MODE() WITHIN GROUP (ORDER BY v.${vendedorCol}) as vendedor_id_principal
        FROM cliente c
        INNER JOIN ${ventasTable} v ON v.${clienteCol} = c.nombre
          AND v.${fechaCol} >= $1 AND v.${fechaCol} < $2
        WHERE NOT EXISTS (
          SELECT 1 FROM ${ventasTable} v2
          WHERE v2.${clienteCol} = c.nombre
            AND v2.${fechaCol} >= $2 AND v2.${fechaCol} <= $3
        )
        ${vendedorFilter}
        GROUP BY c.rut, c.nombre, c.email, c.telefono, c.vendedor_alias, c.ciudad, c.comuna
      )
      SELECT 
        vc.*,
        u.nombre as vendedor_nombre
      FROM ventas_clientes vc
      LEFT JOIN usuario u ON u.id = vc.vendedor_id_principal
      ORDER BY monto_total DESC
      LIMIT 20
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET clients (all for manager, own for vendedor)
router.get('/', auth(), async (req, res) => {
  try {
    let result;
    if (req.user.rol === 'manager') {
      result = await pool.query('SELECT c.*, u.nombre as vendedor_nombre FROM cliente c JOIN usuario u ON c.vendedor_id = u.id ORDER BY c.id ASC');
    } else {
      result = await pool.query('SELECT c.*, u.nombre as vendedor_nombre FROM cliente c JOIN usuario u ON c.vendedor_id = u.id WHERE c.vendedor_id = $1 ORDER BY c.id ASC', [req.user.id]);
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
    result = await pool.query('SELECT * FROM cliente WHERE id = $1', [id]);
  } else {
    result = await pool.query('SELECT * FROM cliente WHERE id = $1 AND vendedor_id = $2', [id, req.user.id]);
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
    const { rut, nombre, direccion, ciudad, estado, codigo_postal, pais, telefono, email, vendedor_id } = req.body;
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

    // Si el usuario es manager y se envía vendedor_id, usarlo. Si no, usar el id del usuario autenticado.
    let vendedorIdToUse = req.user.rol === 'manager' && vendedor_id ? vendedor_id : req.user.id;

    const newClient = await pool.query(
      'INSERT INTO cliente (rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, vendedor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, vendedorIdToUse]
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
        'INSERT INTO cliente (rut, nombre, direccion, telefono, email, vendedor_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
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
            'UPDATE cliente SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 RETURNING *',
            [nombre, direccion, telefono, email, id]
        );
    } else {
        updatedClient = await pool.query(
            'UPDATE cliente SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 AND vendedor_id = $6 RETURNING *',
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
        deleteOp = await pool.query('DELETE FROM cliente WHERE id = $1 RETURNING *', [id]);
    } else {
        deleteOp = await pool.query('DELETE FROM cliente WHERE id = $1 AND vendedor_id = $2 RETURNING *', [id, req.user.id]);
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