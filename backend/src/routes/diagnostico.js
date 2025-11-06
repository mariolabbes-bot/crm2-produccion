const express = require('express');
const router = express.Router();
const pool = require('../db');
// const auth = require('../middleware/auth'); // Temporalmente sin auth para diagnóstico

// GET /api/diagnostico/estructura-venta - Ver estructura real de tabla venta
router.get('/estructura-venta', async (req, res) => {
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
router.get('/estructura-abono', async (req, res) => {
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
router.get('/test-insert', async (req, res) => {
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

// GET /api/diagnostico/test-insert-completo - Probar INSERT con todas las columnas
router.get('/test-insert-completo', async (req, res) => {
  const client = await pool.connect();
  try {
    const testFolio = `TEST-FULL-${Date.now()}`;
    await client.query(`
      INSERT INTO venta (
        sucursal, tipo_documento, folio, fecha_emision, identificador,
        cliente, vendedor_cliente, vendedor_documento,
        estado_sistema, estado_comercial, estado_sii, indice,
        sku, descripcion, cantidad, precio, valor_total, vendedor_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, folio
    `, [
      null, 'Factura', testFolio, '2025-11-06', null,
      null, null, null,
      null, null, null, null,
      null, null, null, null, null, null
    ]);
    
    await client.query('DELETE FROM venta WHERE folio = $1', [testFolio]);
    
    res.json({ 
      success: true, 
      msg: 'INSERT completo exitoso con todas las columnas'
    });
  } catch (err) {
    console.error('Error en test-insert-completo:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      detail: err.detail,
      hint: err.hint,
      position: err.position
    });
  } finally {
    client.release();
  }
});

module.exports = router;
