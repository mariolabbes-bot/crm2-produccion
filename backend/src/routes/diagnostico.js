const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/diagnostico/estructura-venta - Ver estructura real de tabla venta
router.get('/estructura-venta', auth(['manager']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'venta'
      ORDER BY ordinal_position
    `);
    
    res.json({ 
      success: true, 
      columnas: result.rows,
      totalColumnas: result.rows.length
    });
  } catch (err) {
    console.error('Error al obtener estructura:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/diagnostico/estructura-abono - Ver estructura real de tabla abono
router.get('/estructura-abono', auth(['manager']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'abono'
      ORDER BY ordinal_position
    `);
    
    res.json({ 
      success: true, 
      columnas: result.rows,
      totalColumnas: result.rows.length
    });
  } catch (err) {
    console.error('Error al obtener estructura:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/diagnostico/test-insert - Probar INSERT mínimo
router.get('/test-insert', auth(['manager']), async (req, res) => {
  const client = await pool.connect();
  try {
    // Intentar un INSERT con valores mínimos
    const testFolio = `TEST-${Date.now()}`;
    await client.query(`
      INSERT INTO venta (tipo_documento, folio, fecha_emision)
      VALUES ($1, $2, $3)
      RETURNING id, folio
    `, ['Factura', testFolio, '2025-11-06']);
    
    // Si llegó aquí, el INSERT funcionó
    // Eliminar el registro de prueba
    await client.query('DELETE FROM venta WHERE folio = $1', [testFolio]);
    
    res.json({ 
      success: true, 
      msg: 'INSERT de prueba exitoso con columnas mínimas'
    });
  } catch (err) {
    console.error('Error en test-insert:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      detail: err.detail,
      hint: err.hint
    });
  } finally {
    client.release();
  }
});

module.exports = router;
