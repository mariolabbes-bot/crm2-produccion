const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

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

module.exports = router;
