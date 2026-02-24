const pool = require('../src/db');

async function evaluate() {
    console.log('🔍 Evaluando Resultados de la Importación Automática...');

    // 1. Verificar Mapeos Específicos (FEBRERO 2026)
    // ALEJANDRA -> LUIS
    // OCTAVIO -> JOAQUIN
    // MATIAS IGNACIO -> EDUARDO ROJAS
    // ALEJANDRO MAURICIO -> MATIAS FELIPE

    const targetVendors = ['LUIS', 'JOAQUIN', 'EDUARDO ROJAS', 'MATIAS FELIPE', 'ALEJANDRA', 'OCTAVIO', 'MATIAS IGNACIO', 'ALEJANDRO MAURICIO'];

    console.log('\n📊 Ventas por Vendedor (Feb 2026) - Mapeos Clave:');
    const res = await pool.query(`
        SELECT vendedor_documento, COUNT(*) as total_ventas, SUM(valor_total) as monto_total
        FROM venta 
        WHERE fecha_emision >= '2026-02-01'
          AND (
            UPPER(vendedor_documento) = ANY($1) 
            OR vendedor_documento IS NULL
          )
        GROUP BY vendedor_documento
    `, [targetVendors]);
    console.table(res.rows);

    // 2. Verificar Abonos (Feb 2026)
    console.log('\n📊 Abonos Importados (Feb 2026):');
    const resAbonos = await pool.query(`
        SELECT COUNT(*) as count, SUM(monto_neto) as total_neto 
        FROM abono 
        WHERE fecha >= '2026-02-01'
    `);
    console.table(resAbonos.rows);

    // 3. Investigar Errores FK (Vendedores que faltan en usuario)
    // El error FK dice que intentamos insertar un vendedor que no existe en tabla usuario.
    // Revisemos qué vendedores están en venta pero NO en usuario (esto no debería pasar si hay FK, pero chequeemos si hay inconsistencias o si falló el insert).
    // O mejor, simulemos qué vendedores del Excel NO están en la DB.

    // Check total sales count for Feb
    const resTotalVentas = await pool.query(`SELECT COUNT(*) FROM venta WHERE fecha_emision >= '2026-02-01'`);
    console.log(`\n✅ Total Ventas Feb 2026 en DB: ${resTotalVentas.rows[0].count}`);

    pool.end();
}

evaluate();
