const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const csv = require('fast-csv');
const stream = require('stream');

const upload = multer({ storage: multer.memoryStorage() });

// @route   POST /api/sales/bulk
// @desc    Bulk create sales from CSV file
// @access  Private

const { format } = require('fast-csv');
const { Readable } = require('stream');

router.post('/bulk', auth(), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded.' });
  }

  const salesData = [];
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv.parse({ headers: true }))
    .on('error', (error) => {
      console.error(error);
      res.status(400).json({ msg: 'Error parsing CSV file.' });
    })
    .on('data', (row) => {
      salesData.push(row);
    })
    .on('end', async () => {
      if (salesData.length === 0) {
        return res.status(400).json({ msg: 'CSV file is empty or invalid.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const insertedSales = [];
        const failedSales = [];
        const clientRutMap = new Map();
        const allClients = await client.query('SELECT id, rut FROM clients');
        allClients.rows.forEach(c => clientRutMap.set(c.rut, c.id));

        for (const sale of salesData) {
          const { 'RUT': rut, 'FECHA FACTURA': invoice_date, 'NUMERO FACTURA': invoice_number, 'MONTO NETO FACTURA': net_amount } = sale;

          // Validación de formato
          if (!rut || !invoice_date || !invoice_number || !net_amount || isNaN(parseFloat(net_amount))) {
            failedSales.push({ ...sale, motivo: 'Datos incompletos o formato inválido' });
            continue;
          }

          const clientId = clientRutMap.get(rut);

          if (!clientId) {
            failedSales.push({ ...sale, motivo: 'Cliente no encontrado' });
            continue;
          }

          try {
            const newSale = await client.query(
              'INSERT INTO sales (client_id, invoice_number, invoice_date, net_amount) VALUES ($1, $2, $3, $4) ON CONFLICT (client_id, invoice_number) DO NOTHING RETURNING *',
              [clientId, invoice_number, invoice_date, parseFloat(net_amount)]
            );
            if (newSale.rows.length > 0) {
              insertedSales.push(newSale.rows[0]);
            } else {
              failedSales.push({ ...sale, motivo: 'Duplicado: factura ya existe para este cliente' });
            }
          } catch (err) {
            failedSales.push({ ...sale, motivo: 'Error al insertar: ' + err.message });
          }
        }

        await client.query('COMMIT');

        if (failedSales.length > 0) {
          // Generar CSV de registros no cargados
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="ventas_no_cargadas.csv"');
          const csvStream = format({ headers: true });
          Readable.from(failedSales).pipe(csvStream).pipe(res);
        } else {
          res.status(201).json({
            message: `${insertedSales.length} registros de venta importados con éxito. No hubo errores.`,
            data: insertedSales
          });
        }

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
      } finally {
        client.release();
      }
    });
});

module.exports = router;

// @route POST /api/sales/import-json
// @desc  Importar ventas desde JSON [{rut, invoice_number, invoice_date, net_amount}]
// @access Private
router.post('/import-json', auth(), async (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ msg: 'JSON vacío o formato inválido (se esperaba array).' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const clientRutMap = new Map();
    const allClients = await client.query('SELECT id, rut FROM clients');
    allClients.rows.forEach(c => clientRutMap.set(c.rut, c.id));

    const inserted = [];
    const failed = [];
    for (const row of payload) {
      const { rut, invoice_number, invoice_date, net_amount } = row;
      if (!rut || !invoice_number || !invoice_date || net_amount == null) {
        failed.push({ ...row, motivo: 'Campos requeridos faltantes' });
        continue;
      }
      const clientId = clientRutMap.get(rut);
      if (!clientId) {
        failed.push({ ...row, motivo: 'Cliente no encontrado' });
        continue;
      }
      try {
        const ins = await client.query(
          'INSERT INTO sales (client_id, invoice_number, invoice_date, net_amount) VALUES ($1,$2,$3,$4) ON CONFLICT (client_id, invoice_number) DO NOTHING RETURNING *',
          [clientId, invoice_number, invoice_date, parseFloat(net_amount)]
        );
        if (ins.rows.length > 0) inserted.push(ins.rows[0]);
        else failed.push({ ...row, motivo: 'Duplicado' });
      } catch (e) {
        failed.push({ ...row, motivo: 'Error al insertar: ' + e.message });
      }
    }
    await client.query('COMMIT');
    return res.json({ inserted: inserted.length, failed: failed.length, detalles_fallidos: failed });
  } catch (e) {
    await client.query('ROLLBACK');
    return res.status(500).json({ msg: 'Error procesando importación', detail: e.message });
  } finally {
    client.release();
  }
});
