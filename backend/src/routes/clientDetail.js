/**
 * Rutas para Cliente Detail - Ficha de Cliente
 * 
 * Endpoints para obtener información detallada de un cliente:
 * - Información básica
 * - Deuda pendiente
 * - Ventas mensuales (últimos 4 meses)
 * - Productos (últimos 6 meses)
 * - Actividades y observaciones
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// ==================== INFORMACIÓN BÁSICA ====================

/**
 * GET /api/client-detail/:rut
 * Obtiene información básica del cliente
 */
router.get('/:rut', auth(), async (req, res) => {
  try {
    const { rut } = req.params;
    const user = req.user;
    const isManager = user.rol?.toLowerCase() === 'manager';
    
    // Query para obtener info básica del cliente
    let query = `
      SELECT 
        c.rut,
        c.nombre,
        c.email,
        c.telefono,
        c.vendedor_alias,
        c.ciudad,
        c.comuna,
        c.created_at,
        c.updated_at
      FROM cliente c
      WHERE c.rut = $1
    `;
    
    const result = await pool.query(query, [rut]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }
    
    const cliente = result.rows[0];
    
    // Validar permisos: vendedor solo ve sus clientes (basado en vendedor_alias)
    if (!isManager) {
      const nombreVendedor = user.nombre_vendedor || user.alias || '';
      if (nombreVendedor && cliente.vendedor_alias) {
        if (nombreVendedor.toUpperCase().trim() !== cliente.vendedor_alias.toUpperCase().trim()) {
          return res.status(403).json({ msg: 'No tienes permiso para ver este cliente' });
        }
      } else if (nombreVendedor !== cliente.vendedor_alias) {
        return res.status(403).json({ msg: 'No tienes permiso para ver este cliente' });
      }
    }
    
    res.json({
      success: true,
      data: cliente
    });
    
  } catch (error) {
    console.error('❌ Error en GET /client-detail/:rut:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener información del cliente',
      error: error.message
    });
  }
});

// ==================== DEUDA ====================

/**
 * GET /api/client-detail/:rut/deuda
 * Obtiene información de deuda del cliente
 */
router.get('/:rut/deuda', auth(), async (req, res) => {
  try {
    const { rut } = req.params;
    console.log(`📊 [GET /client-detail/:rut/deuda] Obteniendo deuda para RUT: ${rut}`);
    
    // 1. Verificar que cliente existe
    const clienteCheck = await pool.query('SELECT nombre FROM cliente WHERE rut = $1', [rut]);
    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }
    
    const nombreCliente = clienteCheck.rows[0].nombre;
    console.log(`   Cliente encontrado: ${nombreCliente}`);
    
    // 2. Obtener deuda de saldo_credito
    const deudaResult = await pool.query(`
      SELECT 
        deuda,
        COALESCE(limite_credito, 0) as limite_credito,
        ROUND(
          CASE 
            WHEN COALESCE(limite_credito, 0) = 0 THEN 0
            ELSE (deuda / NULLIF(limite_credito, 0) * 100)
          END, 2
        ) as porcentaje_utilizacion,
        COALESCE(limite_credito, 0) - COALESCE(deuda, 0) as disponible
      FROM saldo_credito
      WHERE UPPER(TRIM(cliente)) = UPPER(TRIM($1))
      LIMIT 1
    `, [nombreCliente]);
    
    // 3. Obtener documentos con deuda
    const documentosResult = await pool.query(`
      SELECT 
        v.folio,
        v.tipo_documento,
        v.fecha_emision,
        v.valor_total,
        COALESCE(v.valor_total, 0) as deuda_documento
      FROM venta v
      WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM($1))
      AND COALESCE(v.valor_total, 0) > 0
      ORDER BY v.fecha_emision DESC
      LIMIT 20
    `, [nombreCliente]);
    
    const deuda = deudaResult.rows[0] || {
      deuda: 0,
      limite_credito: 0,
      porcentaje_utilizacion: 0,
      disponible: 0
    };
    
    res.json({
      success: true,
      data: {
        deuda: deuda,
        documentos: documentosResult.rows
      }
    });
    
  } catch (error) {
    console.error('❌ Error en GET /client-detail/:rut/deuda:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener deuda del cliente',
      error: error.message
    });
  }
});

// ==================== VENTAS MENSUAL ====================

/**
 * GET /api/client-detail/:rut/ventas-mensual
 * Obtiene ventas mensuales comparativas (últimos 4 meses)
 */
router.get('/:rut/ventas-mensual', auth(), async (req, res) => {
  try {
    const { rut } = req.params;
    
    const query = `
      WITH meses AS (
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE)::DATE as mes,
          0 as orden
        UNION ALL
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
          1
        UNION ALL
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE,
          2
        UNION ALL
        SELECT 
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')::DATE,
          3
      ),
      ventas_por_mes AS (
        SELECT 
          DATE_TRUNC('month', v.fecha_emision)::DATE as mes,
          SUM(v.valor_total) as monto,
          COUNT(DISTINCT v.folio) as num_ventas
        FROM venta v
        WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM((SELECT nombre FROM cliente WHERE rut = $1)))
        AND v.fecha_emision >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY DATE_TRUNC('month', v.fecha_emision)
      )
      SELECT 
        TO_CHAR(m.mes, 'Mon YYYY') as mes_nombre,
        COALESCE(vpm.monto, 0) as monto,
        COALESCE(vpm.num_ventas, 0) as num_ventas,
        m.orden
      FROM meses m
      LEFT JOIN ventas_por_mes vpm ON m.mes = vpm.mes
      ORDER BY m.orden ASC
    `;
    
    const result = await pool.query(query, [rut]);
    
    // Calcular promedio trimestre anterior
    const meses = result.rows;
    const mesActual = meses[0];
    const trimestralAnterior = meses.slice(1, 4);
    const promedioTrimestral = trimestralAnterior.reduce((sum, m) => sum + parseFloat(m.monto || 0), 0) / 3;
    
    // Calcular variación
    const variacion = mesActual.monto ? 
      ((mesActual.monto - promedioTrimestral) / promedioTrimestral * 100).toFixed(2) : 
      0;
    
    res.json({
      success: true,
      data: {
        meses: meses,
        promedio_trimestre_anterior: parseFloat(promedioTrimestral.toFixed(2)),
        mes_actual: parseFloat(mesActual.monto),
        variacion_porcentaje: parseFloat(variacion),
        trending: variacion > 0 ? 'UP' : variacion < 0 ? 'DOWN' : 'STABLE'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en GET /client-detail/:rut/ventas-mensual:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener ventas mensuales',
      error: error.message
    });
  }
});

// ==================== PRODUCTOS (ÚLTIMOS 6 MESES) ====================

/**
 * GET /api/client-detail/:rut/productos-6m
 * Obtiene productos comprados en últimos 6 meses
 */
router.get('/:rut/productos-6m', auth(), async (req, res) => {
  try {
    const { rut } = req.params;
    
    const query = `
      WITH productos_cliente AS (
        SELECT 
          COALESCE(v.sku, 'SIN_SKU') as sku,
          v.descripcion,
          SUM(v.cantidad) as cantidad_total,
          COUNT(DISTINCT v.folio) as num_compras,
          SUM(v.valor_total) as valor_total,
          MAX(v.fecha_emision) as ultima_compra
        FROM venta v
        WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM((SELECT nombre FROM cliente WHERE rut = $1)))
        AND v.fecha_emision >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY COALESCE(v.sku, 'SIN_SKU'), v.descripcion
      ),
      promedio_anterior AS (
        SELECT 
          COALESCE(v.sku, 'SIN_SKU') as sku,
          AVG(v.cantidad) as cantidad_promedio
        FROM venta v
        WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM((SELECT nombre FROM cliente WHERE rut = $1)))
        AND v.fecha_emision >= CURRENT_DATE - INTERVAL '12 months'
        AND v.fecha_emision < CURRENT_DATE - INTERVAL '6 months'
        GROUP BY COALESCE(v.sku, 'SIN_SKU')
      )
      SELECT 
        pc.sku,
        pc.descripcion,
        pc.cantidad_total,
        pc.num_compras,
        pc.valor_total,
        pc.ultima_compra,
        ROUND(COALESCE(pa.cantidad_promedio, 0), 2) as cantidad_promedio_anterior,
        ROUND(
          CASE 
            WHEN COALESCE(pa.cantidad_promedio, 0) = 0 THEN 0
            ELSE ((pc.cantidad_total - pa.cantidad_promedio) / pa.cantidad_promedio * 100)
          END, 2
        ) as variacion_porcentaje
      FROM productos_cliente pc
      LEFT JOIN promedio_anterior pa ON pc.sku = pa.sku
      ORDER BY pc.cantidad_total DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, [rut]);
    
    res.json({
      success: true,
      data: {
        productos: result.rows,
        total_productos: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error en GET /client-detail/:rut/productos-6m:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener productos del cliente',
      error: error.message
    });
  }
});

// ==================== ACTIVIDADES ====================

/**
 * GET /api/client-detail/:rut/actividades
 * Obtiene últimas 3 actividades/notas del cliente
 */
router.get('/:rut/actividades', auth(), async (req, res) => {
  try {
    const { rut } = req.params;
    
    const query = `
      SELECT 
        ca.id,
        ca.comentario,
        ca.created_at,
        ua.nombre as usuario_nombre,
        ua.rol as usuario_rol,
        ua.id as usuario_alias_id
      FROM cliente_actividad ca
      JOIN usuario_alias ua ON ca.usuario_alias_id = ua.id
      WHERE ca.cliente_rut = $1
      ORDER BY ca.created_at DESC
      LIMIT 3
    `;
    
    const result = await pool.query(query, [rut]);
    
    res.json({
      success: true,
      data: {
        actividades: result.rows,
        total: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error en GET /client-detail/:rut/actividades:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener actividades del cliente',
      error: error.message
    });
  }
});

/**
 * POST /api/client-detail/:rut/actividades
 * Agrega una nueva actividad/nota para el cliente
 */
router.post('/:rut/actividades', auth(), async (req, res) => {
  try {
    const { rut } = req.params;
    const { comentario } = req.body;
    
    if (!comentario || comentario.trim().length === 0) {
      return res.status(400).json({ msg: 'El comentario no puede estar vacío' });
    }
    
    // Verificar que el cliente existe
    const clienteCheck = await pool.query('SELECT rut FROM cliente WHERE rut = $1', [rut]);
    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }
    
    // Obtener usuario_alias_id del usuario actual
    const usuarioAliasResult = await pool.query(
      'SELECT id FROM usuario_alias WHERE id = $1',
      [req.user.id]
    );
    
    if (usuarioAliasResult.rows.length === 0) {
      return res.status(400).json({ msg: 'Usuario no encontrado en usuario_alias' });
    }
    
    const usuarioAliasId = usuarioAliasResult.rows[0].id;
    
    // Insertar actividad
    const query = `
      INSERT INTO cliente_actividad (cliente_rut, usuario_alias_id, comentario, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        cliente_rut,
        usuario_alias_id,
        comentario,
        created_at
    `;
    
    const result = await pool.query(query, [rut, usuarioAliasId, comentario.trim()]);
    
    res.json({
      success: true,
      msg: 'Actividad registrada correctamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error en POST /client-detail/:rut/actividades:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al registrar actividad',
      error: error.message
    });
  }
});

module.exports = router;
