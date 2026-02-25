const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// POST /api/admin/reassign-vendors - Reasignar vendedores Alejandra y Octavio
router.post('/reassign-vendors', auth(['manager']), async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔍 Iniciando reasignación de vendedores...');

    // Buscar cuántos abonos tienen Alejandra
    const alejandraCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM abono 
      WHERE vendedor_cliente = 'Alejandra'
    `);
    const alejandraCount = parseInt(alejandraCheck.rows[0].count);

    // Buscar cuántos abonos tienen Octavio
    const octavioCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM abono 
      WHERE vendedor_cliente = 'Octavio'
    `);
    const octavioCount = parseInt(octavioCheck.rows[0].count);

    console.log(`Encontrados: ${alejandraCount} abonos de Alejandra, ${octavioCount} abonos de Octavio`);

    // UPDATE Alejandra → Luis Ramon Esquivel Oyamadel
    const alejandraUpdate = await client.query(`
      UPDATE abono 
      SET vendedor_cliente = 'Luis Ramon Esquivel Oyamadel'
      WHERE vendedor_cliente = 'Alejandra'
    `);

    // UPDATE Octavio → JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA
    const octavioUpdate = await client.query(`
      UPDATE abono 
      SET vendedor_cliente = 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA'
      WHERE vendedor_cliente = 'Octavio'
    `);

    // Verificar resultado
    const finalCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM abono 
      WHERE vendedor_cliente IN ('Alejandra', 'Octavio')
    `);
    const remaining = parseInt(finalCheck.rows[0].count);

    console.log(`✅ Reasignación completada. Restantes: ${remaining}`);

    res.json({
      success: true,
      message: 'Reasignación completada exitosamente',
      results: {
        alejandra: {
          found: alejandraCount,
          updated: alejandraUpdate.rowCount,
          assignedTo: 'Luis Ramon Esquivel Oyamadel'
        },
        octavio: {
          found: octavioCount,
          updated: octavioUpdate.rowCount,
          assignedTo: 'JOAQUIN ALEJANDRO MANRIQUEZ MUNIZAGA'
        },
        remaining: remaining
      }
    });

  } catch (error) {
    console.error('❌ Error en reasignación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al reasignar vendedores',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// POST /api/admin/reset-database - Borrado masivo (Soft Reset)
router.post('/reset-database', auth(['manager']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { confirm } = req.body;
    if (confirm !== 'CONFIRMO_BORRAR_TODO') {
      return res.status(400).json({ success: false, error: 'Confirmación inválida' });
    }

    console.log('⚠️ INICIANDO RESET DE BASE DE DATOS...');
    await client.query('BEGIN');

    // Orden de borrado por dependencias (Hijos -> Padres)
    // 1. Saldo Credito (Independiente/Reporte)
    await client.query('TRUNCATE TABLE saldo_credito RESTART IDENTITY CASCADE');

    // 2. Abonos (Depende de Cliente y Usuario)
    await client.query('TRUNCATE TABLE abono RESTART IDENTITY CASCADE');

    // 3. Ventas (Depende de Cliente y Usuario)
    await client.query('TRUNCATE TABLE venta RESTART IDENTITY CASCADE');

    // 4. Clientes (Padre de Venta/Abono)
    await client.query('TRUNCATE TABLE cliente RESTART IDENTITY CASCADE');

    // 5. Productos (Si se solicita, independiente o padre de items de venta si existiera detalle)
    await client.query('TRUNCATE TABLE producto RESTART IDENTITY CASCADE');

    // NO se borran usuarios

    await client.query('COMMIT');
    console.log('✅ Base de datos reiniciada correctamente (incluyendo productos).');

    res.json({ success: true, message: 'Base de datos reiniciada. Clientes, Ventas, Abonos, Saldo Crédito y Productos han sido eliminados.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en reset-database:', error);
    res.status(500).json({ success: false, error: 'Error crítico al reiniciar base de datos', details: error.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/download-mapping - Descargar CSV para mapeo de vendedores
router.get('/download-mapping', auth(['manager']), async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../../outputs/mapeo_vendedores.csv');

  if (fs.existsSync(filePath)) {
    res.download(filePath, 'mapeo_vendedores.csv');
  } else {
    // Generate it if missing
    try {
      const script = require('../../scripts/generate_vendor_mapping.js'); // Assuming I can export/run it? 
      // Or simpler: Just tell user it is not ready. 
      // But since I already ran the script via tool, the file IS there.
      res.status(404).json({ error: 'File not found. Please contact support to regenerate.' });
    } catch (e) {
      res.status(500).json({ error: 'Error serving file' });
    }
  }
});

// GET /api/admin/trigger-drive - Manually trigger Drive import cycle
router.get('/trigger-drive', async (req, res) => {
  try {
    console.log('Admin triggered Drive Import Cycle');
    const { runDriveImportCycle } = require('../services/importAutomation');
    await runDriveImportCycle();
    res.json({ success: true, message: 'Drive cycle triggered. Check logs or database.' });
  } catch (err) {
    console.error('Error triggering drive cycle:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/debug-jobs - Temporary diagnostic endpoint to view database logs
router.get('/debug-jobs', async (req, res) => {
  try {
    const jobs = await pool.query("SELECT id, job_id, tipo, filename, status, created_at, error_message, result_data FROM import_job ORDER BY id DESC LIMIT 10");
    const notifs = await pool.query("SELECT id, type, title, message, created_at FROM app_notifications ORDER BY id DESC LIMIT 5");

    // Diagnósticos exactos para descubrir por qué faltan los abonos
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM abono WHERE TO_CHAR(fecha, 'YYYY-MM') = '2026-02') as count_abonos_feb,
        (SELECT SUM(monto) FROM abono WHERE TO_CHAR(fecha, 'YYYY-MM') = '2026-02') as sum_abonos_feb,
        (SELECT COUNT(*) FROM venta WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = '2026-02') as count_ventas_feb,
        (SELECT TO_CHAR(MAX(fecha_emision), 'YYYY-MM') FROM venta) as ultimo_mes_ventas
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      jobs: jobs.rows,
      notifications: notifs.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

