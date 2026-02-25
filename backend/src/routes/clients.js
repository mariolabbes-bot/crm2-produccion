const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ClientService = require('../services/clientService');
const XLSX = require('xlsx');

// GET /incomplete - List clients details that need attention
router.get('/incomplete', auth(), async (req, res) => {
  try {
    const clients = await ClientService.getIncompleteClients();
    res.json(clients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /incomplete/download - Download Excel of incomplete clients
router.get('/incomplete/download', auth(), async (req, res) => {
  try {
    const clients = await ClientService.getIncompleteClients();
    if (clients.length === 0) return res.status(404).send('No incomplete clients found');

    const ws = XLSX.utils.json_to_sheet(clients.map(c => ({
      RUT: c.rut,
      Nombre: c.nombre,
      Direccion: c.direccion || '',
      Telefono: c.telefono || '',
      Email: c.email || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incompletos');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Clientes_Incompletos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET top 20 clientes inactivos mes actual
router.get('/inactivos-mes-actual', auth(), async (req, res) => {
  try {
    const results = await ClientService.getInactivosMesActual(req.user, req.query.vendedor_id);
    res.json(results);
  } catch (err) {
    console.error('Error in inactivos-mes-actual:', err.message);
    res.status(500).send('Server Error');
  }
});

// GET all clients (filtered by permission)
router.get('/', auth(), async (req, res) => {
  try {
    const clients = await ClientService.getAllClients(req.user);
    res.json(clients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// CREATE client
router.post('/', auth(), async (req, res) => {
  try {
    const newClient = await ClientService.createClient(req.body, req.user);
    res.status(201).json(newClient);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// BULK CREATE
router.post('/bulk', auth(), async (req, res) => {
  try {
    const inserted = await ClientService.bulkCreateClients(req.body, req.user);
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// UPDATE client
router.put('/:id', auth(), async (req, res) => {
  try {
    const updated = await ClientService.updateClient(req.params.id, req.body, req.user);
    if (!updated) return res.status(404).json({ msg: 'Client not found' });
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE client
router.delete('/:id', auth(), async (req, res) => {
  try {
    const deleted = await ClientService.deleteClient(req.params.id, req.user);
    if (!deleted) return res.status(404).json({ msg: 'Client not found' });
    res.json({ msg: 'Client deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET Top Ventas V2
router.get('/top-ventas-v2', auth(), async (req, res) => {
  try {
    const results = await ClientService.getTopVentas(req.user, req.query.vendedor_id);
    res.json(results);
  } catch (err) {
    console.error('Error top-ventas-v2:', err.message);
    res.status(500).json({ msg: 'Error al obtener top clientes', error: err.message });
  }
});

// GET Facturas Impagas
router.get('/facturas-impagas', auth(), async (req, res) => {
  try {
    const results = await ClientService.getFacturasImpagas(req.user, req.query.vendedor_id);
    res.json(results);
  } catch (err) {
    console.error('Error facturas-impagas:', err.message);
    res.status(500).json({ msg: 'Error al obtener facturas impagas', error: err.message });
  }
});

// GET Search
router.get('/search', auth(), async (req, res) => {
  try {
    const results = await ClientService.searchClients(req.query.q, req.user, req.query.vendedor_id);
    res.json(results);
  } catch (err) {
    console.error('Error search:', err.message);
    res.status(500).json({ msg: 'Error al buscar clientes', error: err.message });
  }
});

// PATCH Bulk Assign Circuit
router.patch('/bulk-circuit', auth(), async (req, res) => {
  try {
    const { ruts, circuito } = req.body;
    if (!ruts || !Array.isArray(ruts) || ruts.length === 0) {
      return res.status(400).json({ msg: 'Debe proveer un array de ruts' });
    }
    if (!circuito) {
      return res.status(400).json({ msg: 'Debe proveer un circuito' });
    }
    const result = await ClientService.bulkAssignCircuit(ruts, circuito, req.user);
    res.json(result);
  } catch (err) {
    console.error('Error bulk-circuit:', err.message);
    res.status(500).json({ msg: 'Error en asignación masiva', error: err.message });
  }
});

// GET single client by RUT (last to avoid route conflict)
router.get('/:id', auth(), async (req, res) => {
  try {
    const client = await ClientService.getClientByRut(req.params.id, req.user);
    if (!client) return res.status(404).json({ msg: 'Client not found' });
    res.json(client);
  } catch (err) {
    if (err.message === 'Access denied') return res.status(403).json({ msg: 'Access denied' });
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;