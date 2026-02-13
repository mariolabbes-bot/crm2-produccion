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
        const allClients = await client.query('SELECT id, rut FROM cliente');
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

// @route   GET /api/sales/report
// @desc    Obtener reporte detallado de ventas con comparativas
// @access  Private
router.get('/report', auth(), async (req, res) => {
  try {
    const { vendedor_id, categoria, sort_by = 'monto' } = req.query;
    const isManager = req.user.rol.toUpperCase() === 'MANAGER';

    // 2. Filtro Vendedor (RUT)
    let targetRut = null;
    if (isManager && vendedor_id) {
      targetRut = vendedor_id;
    } else if (!isManager) {
      targetRut = req.user.rut;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Rango Mes Actual
    const startCurrent = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endCurrent = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    // Rango Mes Año Anterior
    const startLastYear = `${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-01`;
    const endLastYear = new Date(currentYear - 1, currentMonth, 0).toISOString().split('T')[0];

    // Rango 6 meses anteriores (sin contar el actual)
    const start6m = new Date(currentYear, currentMonth - 7, 1).toISOString().split('T')[0];
    const end6m = new Date(currentYear, currentMonth - 1, 0).toISOString().split('T')[0];

    let whereClauses = [];
    let params = [startCurrent, endCurrent, startLastYear, endLastYear, start6m, end6m];

    if (categoria && categoria !== 'TODOS LOS PRODUCTOS') {
      if (categoria === 'APLUS TBR') {
        whereClauses.push("UPPER(cp.subfamilia) LIKE '%TBR%' AND UPPER(cp.marca) = 'APLUS'");
      } else if (categoria === 'APLUS PCR') {
        whereClauses.push("UPPER(cp.subfamilia) LIKE '%PCR%' AND UPPER(cp.marca) = 'APLUS'");
      } else if (categoria === 'LUBRICANTES') {
        whereClauses.push("UPPER(cp.familia) LIKE '%LUBRICANTE%'");
      } else if (categoria === 'REENCAUCHE') {
        whereClauses.push("UPPER(cp.familia) LIKE '%REENCAUCHE%'");
      }
    }

    const whereSql = whereClauses.length > 0 ? 'AND ' + whereClauses.join(' AND ') : '';
    const sortColumn = sort_by === 'cantidad' ? 'cantidad_mes_actual' : 'volumen_dinero_mes_actual';

    let vendorFilterSql = '';
    let vendorJoinSql = '';
    if (targetRut) {
      params.push(targetRut);
      vendorJoinSql = `
        LEFT JOIN usuario u_filt ON UPPER(TRIM(u_filt.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
        LEFT JOIN usuario u2_filt ON UPPER(TRIM(u2_filt.alias)) = UPPER(TRIM(v.vendedor_documento))
      `;
      vendorFilterSql = `AND COALESCE(u_filt.rut, u2_filt.rut) = $${params.length}`;
    }

    const query = `
            WITH ventas_agrupadas AS (
                SELECT 
                    cp.sku,
                    cp.descripcion,
                    cp.litros,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $1 AND $2 THEN v.cantidad ELSE 0 END) as qty_actual,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $1 AND $2 THEN v.valor_total ELSE 0 END) as monto_actual,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $3 AND $4 THEN v.cantidad ELSE 0 END) as qty_anio_ant,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $5 AND $6 THEN v.cantidad ELSE 0 END) as qty_6m
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                ${vendorJoinSql}
                WHERE (v.fecha_emision BETWEEN $1 AND $2 
                   OR v.fecha_emision BETWEEN $3 AND $4 
                   OR v.fecha_emision BETWEEN $5 AND $6)
                ${whereSql}
                ${vendorFilterSql}
                GROUP BY cp.sku, cp.descripcion, cp.litros
            )
            SELECT 
                descripcion,
                qty_actual as cantidad_mes_actual,
                (qty_actual * litros) as litros_mes_actual,
                monto_actual as volumen_dinero_mes_actual,
                CASE WHEN qty_anio_ant > 0 THEN ROUND(((qty_actual - qty_anio_ant) / qty_anio_ant * 100), 1) ELSE 0 END as perc_vs_anio_ant,
                CASE WHEN qty_6m > 0 THEN ROUND(((qty_actual - (qty_6m / 6.0)) / (qty_6m / 6.0) * 100), 1) ELSE 0 END as perc_vs_prom_6m
            FROM ventas_agrupadas
            WHERE qty_actual > 0 OR qty_anio_ant > 0 OR qty_6m > 0
            ORDER BY ${sortColumn} DESC
            LIMIT 20
        `;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('❌ Error Reporte Ventas:', error);
    res.status(500).json({ success: false, msg: 'Error generando reporte de ventas', detail: error.message });
  }
});

module.exports = router;
