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

// GET /api/diagnostico/run-migration-004 - Ejecuta la migración 004 para el flujo del vendedor
router.get('/run-migration-004', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('👷 Iniciando Migración Manual 004 vía Diagnóstico...');
    await client.query('BEGIN');

    // 1. Crear tabla de tipos si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_types (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(50) UNIQUE NOT NULL,
          descripcion TEXT,
          icon VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Insertar tipos base
    await client.query(`
      INSERT INTO activity_types (nombre, descripcion, icon)
      VALUES 
          ('VISITA', 'Visita presencial a local de cliente', 'directions_walk'),
          ('LLAMADA', 'Contacto telefónico comercial', 'phone'),
          ('COTIZACION', 'Generación o revisión de cotización', 'request_quote'),
          ('MENSAJE', 'Contacto vía WhatsApp o Mensajería', 'message')
      ON CONFLICT (nombre) DO UPDATE SET 
          descripcion = EXCLUDED.descripcion,
          icon = EXCLUDED.icon
    `);

    // 3. Columnas en visitas_registro
    await client.query(`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='notas') THEN
              ALTER TABLE visitas_registro ADD COLUMN notas TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='activity_type_id') THEN
              ALTER TABLE visitas_registro ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
          END IF;
      END $$;
    `);

    // 4. Columnas en cliente_actividad
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cliente_actividad' AND column_name='activity_type_id') THEN
              ALTER TABLE cliente_actividad ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
          END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('✅ Migración Manual 004 completada.');

    res.json({ success: true, message: 'Migración 004 (Flujo Vendedor) aplicada correctamente vía Diagnóstico.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración manual:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
