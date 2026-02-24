const pool = require('../src/db');

async function auditAbonos() {
    try {
        console.log('🔍 Auditando tabla ABONO para Febrero 2026...');

        // 1. Totales Generales
        const resTotal = await pool.query(`
            SELECT COUNT(*) as count, SUM(monto) as total_monto, MIN(fecha) as min_fecha, MAX(fecha) as max_fecha 
            FROM abono 
            WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
        `);
        console.log('\n📊 Resumen General Febrero 2026:');
        console.table(resTotal.rows);

        // 2. Agrupado por Día
        const resDia = await pool.query(`
            SELECT fecha::date as dia, COUNT(*) as registros, SUM(monto) as monto_dia
            FROM abono 
            WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
            GROUP BY dia
            ORDER BY dia ASC
        `);
        console.log('\n📅 Desglose por Día:');
        console.table(resDia.rows);

        // 3. Agrupado por Vendedor (Original del Excel vs Normalizado)
        // Nota: vendedor_cliente es lo que guardamos
        const resVendedor = await pool.query(`
            SELECT vendedor_cliente, COUNT(*) as registros, SUM(monto) as monto_vendedor
            FROM abono 
            WHERE fecha >= '2026-02-01' AND fecha < '2026-03-01'
            GROUP BY vendedor_cliente
            ORDER BY monto_vendedor DESC
        `);
        console.log('\n👤 Desglose por Vendedor:');
        console.table(resVendedor.rows);

        // 4. Buscar posibles duplicados (Mismo Folio+ID, o misma fecha+monto+cliente)
        // Mismo Folio + ID debería ser único por diseño, pero verifiquemos si hay algo raro en otras columnas
        const resDup = await pool.query(`
            SELECT folio, identificador_abono, COUNT(*) 
            FROM abono 
            WHERE fecha >= '2026-02-01'
            GROUP BY folio, identificador_abono
            HAVING COUNT(*) > 1
        `);
        console.log(`\n⚠️ Duplicados por Key (Folio+ID): ${resDup.rowCount}`);
        if (resDup.rowCount > 0) console.table(resDup.rows);

        // 5. Buscar "Casi Duplicados" (Mismo Cliente + Misma Fecha + Mismo Monto, dif Folio?)
        const resSuspicious = await pool.query(`
           SELECT cliente, fecha, monto, COUNT(*) as cnt, string_agg(folio, ', ') as folios
           FROM abono
           WHERE fecha >= '2026-02-01'
           GROUP BY cliente, fecha, monto
           HAVING COUNT(*) > 1
           ORDER BY cnt DESC
           LIMIT 20
        `);
        console.log('\n🧐 Posibles Duplicados (Mismo Cliente+Fecha+Monto):');
        console.table(resSuspicious.rows);

    } catch (err) {
        console.error('Error en auditoría:', err);
    } finally {
        pool.end();
    }
}

auditAbonos();
