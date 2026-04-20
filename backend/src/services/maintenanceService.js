const pool = require('../db');

class MaintenanceService {
    /**
     * Realiza la limpieza de datos históricos (> 24 meses)
     * Conserva ventas con saldo pendiente.
     */
    static async runRoutineCleanup(isDryRun = false) {
        const periodMonths = 24;
        const results = {
            ventasEliminadas: 0,
            abonosEliminados: 0,
            isDryRun
        };

        const client = await pool.connect();
        try {
            if (isDryRun) {
                const simV = await client.query(`
                    SELECT count(*) FROM venta 
                    WHERE fecha_emision < (CURRENT_DATE - INTERVAL '${periodMonths} months')
                    AND folio NOT IN (SELECT folio::text FROM saldo_credito WHERE folio IS NOT NULL)
                `);
                const simA = await client.query(`
                    SELECT count(*) FROM abono 
                    WHERE fecha < (CURRENT_DATE - INTERVAL '${periodMonths} months')
                `);
                results.ventasEliminadas = parseInt(simV.rows[0].count);
                results.abonosEliminados = parseInt(simA.rows[0].count);
            } else {
                await client.query('BEGIN');
                
                const resV = await client.query(`
                    DELETE FROM venta 
                    WHERE fecha_emision < (CURRENT_DATE - INTERVAL '${periodMonths} months')
                    AND folio NOT IN (SELECT folio::text FROM saldo_credito WHERE folio IS NOT NULL)
                `);
                results.ventasEliminadas = resV.rowCount;

                const resA = await client.query(`
                    DELETE FROM abono 
                    WHERE fecha < (CURRENT_DATE - INTERVAL '${periodMonths} months')
                `);
                results.abonosEliminados = resA.rowCount;

                await client.query('COMMIT');
            }
            return results;
        } catch (error) {
            if (!isDryRun) await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = MaintenanceService;
