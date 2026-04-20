/**
 * SCRIPT DE DIAGNÓSTICO DE RENDIMIENTO
 * Propósito: Medir el tiempo de ejecución de las consultas SQL críticas del Dashboard.
 */
const pool = require('../src/db');

async function runPerformanceDiagnostic() {
  console.log('🚀 Iniciando Diagnóstico de Rendimiento SQL...\n');

  try {
    // 1. Verificar conteo de datos actual
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM venta) as total_ventas,
        (SELECT COUNT(*) FROM cliente) as total_clientes,
        (SELECT COUNT(*) FROM abono) as total_abonos,
        (SELECT COUNT(*) FROM usuario) as total_usuarios
    `);
    
    console.log('📊 Estado actual de la base de datos:');
    console.table(counts.rows[0]);
    console.log('\n');

    // Muestras de consultas críticas
    const queries = [
      {
        name: 'Dashboard Current - Ventas Mes (con REGEXP JOIN)',
        sql: `
          SELECT COALESCE(SUM(t.valor_total), 0) as total
          FROM venta t
          INNER JOIN cliente c ON (
            REGEXP_REPLACE(t.identificador, '[^a-zA-Z0-9]', '', 'g') = REGEXP_REPLACE(c.rut, '[^a-zA-Z0-9]', '', 'g')
            OR (t.identificador IS NULL AND UPPER(TRIM(t.cliente)) = UPPER(TRIM(c.nombre)))
          )
          LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
          WHERE TO_CHAR(t.fecha_emision, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `
      },
      {
        name: 'Dashboard Current - Ventas Mes (OPTIMIZADA con rut_idx)',
        sql: `
          SELECT COALESCE(SUM(t.valor_total), 0) as total
          FROM venta t
          INNER JOIN cliente c ON (t.rut_idx = c.rut_idx OR (t.rut_idx IS NULL AND t.nombre_idx = c.nombre_idx))
          LEFT JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
          WHERE TO_CHAR(t.fecha_emision, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        `
      },
      {
        name: 'Ranking Vendedores (Consulta Compleja con CTEs)',
        sql: `
          WITH sales_stats AS (
            SELECT 
              u.rut,
              SUM(s.valor_total) as ventas_mes_actual
            FROM venta s
            INNER JOIN cliente c ON (
              REGEXP_REPLACE(s.identificador, '[^a-zA-Z0-9]', '', 'g') = REGEXP_REPLACE(c.rut, '[^a-zA-Z0-9]', '', 'g')
              OR (s.identificador IS NULL AND UPPER(TRIM(s.cliente)) = UPPER(TRIM(c.nombre)))
            )
            JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
            WHERE TO_CHAR(s.fecha_emision, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            GROUP BY 1
          )
          SELECT u.nombre_vendedor, COALESCE(s.ventas_mes_actual, 0)
          FROM usuario u
          LEFT JOIN sales_stats s ON u.rut = s.rut
          WHERE LOWER(u.rol_usuario) IN ('vendedor', 'manager')
          LIMIT 10
        `
      },
      {
        name: 'Ranking Vendedores (OPTIMIZADA con rut_idx)',
        sql: `
          WITH sales_stats AS (
            SELECT 
              u.rut_idx,
              SUM(s.valor_total) as ventas_mes_actual
            FROM venta s
            INNER JOIN cliente c ON (s.rut_idx = c.rut_idx OR (s.rut_idx IS NULL AND s.nombre_idx = c.nombre_idx))
            JOIN usuario u ON (c.vendedor_id::text = u.id::text OR c.vendedor_id::text = u.rut)
            WHERE TO_CHAR(s.fecha_emision, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
            GROUP BY 1
          )
          SELECT u.nombre_vendedor, COALESCE(s.ventas_mes_actual, 0)
          FROM usuario u
          LEFT JOIN sales_stats s ON u.rut_idx = s.rut_idx
          WHERE LOWER(u.rol_usuario) IN ('vendedor', 'manager')
          ORDER BY 2 DESC
          LIMIT 10
        `
      },
      {
        name: 'Evolución YoY (Comparativa Interanual)',
        sql: `
          SELECT 
            TO_CHAR(s.fecha_emision, 'YYYY-MM') as periodo,
            SUM(s.valor_total) as total_ventas
          FROM venta s
          GROUP BY 1
          ORDER BY 1 DESC
          LIMIT 12
        `
      }
    ];

    for (const q of queries) {
      console.log(`⏱️ Ejecutando: ${q.name}...`);
      const start = Date.now();
      try {
        const res = await pool.query(q.sql);
        const end = Date.now();
        console.log(`✅ Completado en: ${end - start}ms (Filas devueltas: ${res.rowCount})`);
      } catch (e) {
        console.error(`❌ Error en consulta "${q.name}":`, e.message);
      }
      console.log('---');
    }

  } catch (err) {
    console.error('💥 Error fatal en el diagnóstico:', err);
  } finally {
    await pool.end();
    console.log('\n🏁 Diagnóstico finalizado.');
  }
}

runPerformanceDiagnostic();
