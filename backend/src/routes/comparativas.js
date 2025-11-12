const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/comparativas/mensuales - Comparativas de ventas mensuales
router.get('/mensuales', auth(), async (req, res) => {
  try {
    const { mes_actual } = req.query; // Formato: YYYY-MM (opcional, por defecto mes actual)
    const user = req.user;

    // Determinar mes actual a analizar
    const mesActual = mes_actual || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, month] = mesActual.split('-').map(Number);

    // Calcular meses anteriores
    const mes1Atras = new Date(year, month - 2, 1).toISOString().slice(0, 7);
    const mes2Atras = new Date(year, month - 3, 1).toISOString().slice(0, 7);
    const mes3Atras = new Date(year, month - 4, 1).toISOString().slice(0, 7);

    // Calcular mismo mes año anterior
    const mesAnioAnterior = new Date(year - 1, month - 1, 1).toISOString().slice(0, 7);

    // Detección dinámica de tabla y columna de fecha
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('venta', 'sales', 'ventas')
      ORDER BY CASE table_name WHEN 'venta' THEN 1 WHEN 'ventas' THEN 2 ELSE 3 END
      LIMIT 1
    `);
    const salesTable = tableCheck.rows[0]?.table_name || 'venta';

    const dateColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('fecha_emision', 'fecha', 'fecha_venta', 'created_at')
      ORDER BY CASE column_name WHEN 'fecha_emision' THEN 1 WHEN 'fecha' THEN 2 WHEN 'fecha_venta' THEN 3 ELSE 4 END
      LIMIT 1
    `, [salesTable]);
    const dateCol = dateColCheck.rows[0]?.column_name || 'fecha_emision';

    // Detectar columna de vendedor en tabla ventas
    let vendedorCol = 'vendedor_id';
    const vendedorColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('vendedor_id', 'vendedor_cliente')
      LIMIT 1
    `, [salesTable]);
    if (vendedorColCheck.rows.length > 0) {
      vendedorCol = vendedorColCheck.rows[0].column_name;
    }

    // Detectar columna de monto
    const amountColCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      AND column_name IN ('valor_total', 'total_venta', 'monto_total', 'net_amount')
      ORDER BY CASE column_name WHEN 'valor_total' THEN 1 WHEN 'total_venta' THEN 2 WHEN 'monto_total' THEN 3 ELSE 4 END
      LIMIT 1
    `, [salesTable]);
    const amountCol = amountColCheck.rows[0]?.column_name || 'valor_total';

    // Filtro por vendedor si es vendedor (no manager)
    let vendedorFilter = '';
    let params = [];
    if (user.rol !== 'MANAGER') {
      if (vendedorCol === 'vendedor_cliente') {
        // Obtener alias del usuario
        const userAlias = await pool.query('SELECT alias FROM usuario WHERE rut = $1', [user.rut]);
        if (userAlias.rows.length > 0 && userAlias.rows[0].alias) {
          vendedorFilter = `AND UPPER(${vendedorCol}) = UPPER($1)`;
          params = [userAlias.rows[0].alias];
        }
      } else {
        vendedorFilter = `AND ${vendedorCol} = $1`;
        params = [user.rut];
      }
    }

    // Query: Ventas por vendedor y mes
    // Si usa vendedor_cliente, agrupamos por nombre y luego hacemos JOIN con usuario
    const query = vendedorCol === 'vendedor_cliente' ? `
      WITH ventas_mensuales AS (
        SELECT 
          UPPER(TRIM(${vendedorCol})) as vendedor_nombre,
          TO_CHAR(${dateCol}, 'YYYY-MM') as mes,
          SUM(${amountCol}) as total_ventas
        FROM ${salesTable}
        WHERE TO_CHAR(${dateCol}, 'YYYY-MM') IN ($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5})
        ${vendedorFilter}
        GROUP BY UPPER(TRIM(${vendedorCol})), TO_CHAR(${dateCol}, 'YYYY-MM')
      )
      SELECT 
        u.rut as vendedor_id,
        u.nombre_completo as vendedor_nombre,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 1} THEN vm.total_ventas END), 0) as mes_actual,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 2} THEN vm.total_ventas END), 0) as mes_1,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 3} THEN vm.total_ventas END), 0) as mes_2,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 4} THEN vm.total_ventas END), 0) as mes_3,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 5} THEN vm.total_ventas END), 0) as mes_anio_anterior
      FROM usuario u
      LEFT JOIN ventas_mensuales vm ON UPPER(TRIM(u.alias)) = vm.vendedor_nombre
      WHERE u.rol_usuario = 'VENDEDOR'
      GROUP BY u.rut, u.nombre_completo
      ORDER BY u.nombre_completo
    ` : `
      WITH ventas_mensuales AS (
        SELECT 
          ${vendedorCol} as vendedor_id,
          TO_CHAR(${dateCol}, 'YYYY-MM') as mes,
          SUM(${amountCol}) as total_ventas
        FROM ${salesTable}
        WHERE TO_CHAR(${dateCol}, 'YYYY-MM') IN ($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5})
        ${vendedorFilter}
        GROUP BY ${vendedorCol}, TO_CHAR(${dateCol}, 'YYYY-MM')
      )
      SELECT 
        u.rut as vendedor_id,
        u.nombre_completo as vendedor_nombre,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 1} THEN vm.total_ventas END), 0) as mes_actual,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 2} THEN vm.total_ventas END), 0) as mes_1,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 3} THEN vm.total_ventas END), 0) as mes_2,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 4} THEN vm.total_ventas END), 0) as mes_3,
        COALESCE(MAX(CASE WHEN vm.mes = $${params.length + 5} THEN vm.total_ventas END), 0) as mes_anio_anterior
      FROM usuario u
      LEFT JOIN ventas_mensuales vm ON vm.vendedor_id = u.rut
      WHERE u.rol_usuario = 'VENDEDOR'
      GROUP BY u.rut, u.nombre_completo
      ORDER BY u.nombre_completo
    `;

    params.push(mesActual, mes1Atras, mes2Atras, mes3Atras, mesAnioAnterior);

    const result = await pool.query(query, params);

    // Calcular promedios y variaciones
    const comparativas = result.rows.map(row => {
      const mesActual = parseFloat(row.mes_actual) || 0;
      const mes1 = parseFloat(row.mes_1) || 0;
      const mes2 = parseFloat(row.mes_2) || 0;
      const mes3 = parseFloat(row.mes_3) || 0;
      const mesAnioAnterior = parseFloat(row.mes_anio_anterior) || 0;

      // Promedio últimos 3 meses
      const promedio3Meses = (mes1 + mes2 + mes3) / 3;

      // Variación vs promedio
      const variacionPromedioPesos = mesActual - promedio3Meses;
      const variacionPromedioPorcentaje = promedio3Meses > 0 
        ? ((mesActual - promedio3Meses) / promedio3Meses * 100).toFixed(2)
        : 0;

      // Variación vs año anterior
      const variacionAnioAnteriorPesos = mesActual - mesAnioAnterior;
      const variacionAnioAnteriorPorcentaje = mesAnioAnterior > 0
        ? ((mesActual - mesAnioAnterior) / mesAnioAnterior * 100).toFixed(2)
        : 0;

      return {
        vendedor_id: row.vendedor_id,
        vendedor_nombre: row.vendedor_nombre,
        mes_actual: mesActual,
        promedio_3_meses: promedio3Meses,
        variacion_promedio_pesos: variacionPromedioPesos,
        variacion_promedio_porcentaje: parseFloat(variacionPromedioPorcentaje),
        mes_anio_anterior: mesAnioAnterior,
        variacion_anio_anterior_pesos: variacionAnioAnteriorPesos,
        variacion_anio_anterior_porcentaje: parseFloat(variacionAnioAnteriorPorcentaje)
      };
    });

    res.json({
      success: true,
      data: {
        mes_actual: mesActual,
        mes_anio_anterior: mesAnioAnterior,
        meses_comparacion: [mes1Atras, mes2Atras, mes3Atras],
        comparativas
      }
    });

  } catch (error) {
    console.error('Error en comparativas mensuales:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Error al obtener comparativas', 
      error: error.message 
    });
  }
});

module.exports = router;
