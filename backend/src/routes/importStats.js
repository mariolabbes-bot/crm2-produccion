const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/import/stats - Obtener estadísticas de importación
// Retorna fechas más recientes de cada tabla
router.get('/stats', auth(), async (req, res) => {
  try {
    console.log('📊 [API] GET /api/import/stats');

    const stats = {};

    // 1. Ventas - Fecha más reciente
    try {
      const ventasRes = await pool.query(`
        SELECT MAX(fecha_emision) as ultima_fecha, COUNT(*) as total
        FROM venta
        WHERE fecha_emision IS NOT NULL
      `);
      stats.ventas = {
        ultima_fecha: ventasRes.rows[0]?.ultima_fecha || null,
        total_registros: parseInt(ventasRes.rows[0]?.total || 0),
        tipo: 'Ventas'
      };
      console.log('  ✅ Ventas:', stats.ventas.ultima_fecha);
    } catch (err) {
      console.warn('  ⚠️  Error Ventas:', err.message);
      stats.ventas = { ultima_fecha: null, total_registros: 0, error: err.message };
    }

    // 2. Abonos - Fecha más reciente
    try {
      const abonosRes = await pool.query(`
        SELECT MAX(fecha) as ultima_fecha, COUNT(*) as total
        FROM abono
        WHERE fecha IS NOT NULL
      `);
      stats.abonos = {
        ultima_fecha: abonosRes.rows[0]?.ultima_fecha || null,
        total_registros: parseInt(abonosRes.rows[0]?.total || 0),
        tipo: 'Abonos'
      };
      console.log('  ✅ Abonos:', stats.abonos.ultima_fecha);
    } catch (err) {
      console.warn('  ⚠️  Error Abonos:', err.message);
      stats.abonos = { ultima_fecha: null, total_registros: 0, error: err.message };
    }

    // 3. Clientes - Fecha de creación/actualización más reciente
    try {
      const clientesRes = await pool.query(`
        SELECT MAX(created_at) as ultima_fecha, COUNT(*) as total
        FROM cliente
      `);
      stats.clientes = {
        ultima_fecha: clientesRes.rows[0]?.ultima_fecha || null,
        total_registros: parseInt(clientesRes.rows[0]?.total || 0),
        tipo: 'Clientes'
      };
      console.log('  ✅ Clientes:', stats.clientes.ultima_fecha);
    } catch (err) {
      console.warn('  ⚠️  Error Clientes:', err.message);
      stats.clientes = { ultima_fecha: null, total_registros: 0, error: err.message };
    }

    // 4. Saldo Crédito - Fecha de creación más reciente (Importación)
    try {
      const creditoRes = await pool.query(`
        SELECT MAX(created_at) as ultima_fecha, COUNT(*) as total
        FROM saldo_credito
      `);
      stats.credito = {
        ultima_fecha: creditoRes.rows[0]?.ultima_fecha || null,
        total_registros: parseInt(creditoRes.rows[0]?.total || 0),
        tipo: 'Saldo Crédito'
      };
      console.log('  ✅ Crédito:', stats.credito.ultima_fecha);
    } catch (err) {
      console.warn('  ⚠️  Error Crédito:', err.message);
      stats.credito = { ultima_fecha: null, total_registros: 0, error: err.message };
    }

    // 5. Stock - Fecha de última actualización (Importación)
    try {
      const stockRes = await pool.query(`
        SELECT MAX(ultima_actualizacion) as ultima_fecha, COUNT(*) as total
        FROM stock
      `);
      stats.stock = {
        ultima_fecha: stockRes.rows[0]?.ultima_fecha || null,
        total_registros: parseInt(stockRes.rows[0]?.total || 0),
        tipo: 'Stock'
      };
      console.log('  ✅ Stock:', stats.stock.ultima_fecha);
    } catch (err) {
      console.warn('  ⚠️  Error Stock:', err.message);
      stats.stock = { ultima_fecha: null, total_registros: 0, error: err.message };
    }

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en /api/import/stats:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener estadísticas de importación',
      error: error.message
    });
  }
});

module.exports = router;
