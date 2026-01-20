const pool = require('./src/db');

async function fixAbonos() {
    try {
        console.log('--- Iniciando Limpieza y Corrección de Abonos ---');

        // 1. Deduplicar (mantener el ID más bajo)
        // Usamos COALESCE para agrupar NULLs en identificador_abono
        console.log('1. Eliminando duplicados...');
        const deleteRes = await pool.query(`
            DELETE FROM abono a
            USING (
                SELECT min(id) as id, folio, fecha, COALESCE(identificador_abono, 'NULL_PLACEHOLDER') as id_abono_key
                FROM abono
                GROUP BY folio, fecha, COALESCE(identificador_abono, 'NULL_PLACEHOLDER')
                HAVING COUNT(*) > 1
            ) b
            WHERE a.folio = b.folio 
            AND a.fecha = b.fecha 
            AND COALESCE(a.identificador_abono, 'NULL_PLACEHOLDER') = b.id_abono_key
            AND a.id <> b.id
        `);
        console.log(`   ✅ Se eliminaron ${deleteRes.rowCount} registros duplicados.`);

        // 2. Backfill Monto Neto
        console.log('2. Calculando monto_neto faltante...');
        const updateRes = await pool.query(`
            UPDATE abono
            SET monto_neto = ROUND(monto / 1.19)
            WHERE (monto_neto IS NULL OR monto_neto = 0)
            AND monto IS NOT NULL
        `);
        console.log(`   ✅ Se actualizaron ${updateRes.rowCount} registros con monto_neto.`);

        console.log('--- Finalizado ---');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixAbonos();
