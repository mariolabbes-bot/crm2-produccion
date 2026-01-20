const pool = require('./src/db');

async function cleanup() {
    try {
        console.log('--- Cleaning up Jan 2026 Duplicates ---');

        // Strategy: Delete rows with empty ID if matches another row with same Folio (regardless of ID)
        // Wait, if I have 2 rows with empty ID (diff dates), and no other rows.
        // a2.folio = abono.folio AND a2.id <> abono.id.
        // They identify each other as "other". Both would be deleted?
        // Yes! UNSAFE.

        // Safer Strategy:
        // Delete row R1 (ID='') if there exists R2 (ID != '') with same Folio.

        const res = await pool.query(`
            DELETE FROM abono a1
            WHERE a1.fecha >= '2026-01-01' AND a1.fecha < '2026-02-01'
            AND (a1.identificador_abono = '' OR a1.identificador_abono IS NULL)
            AND EXISTS (
                SELECT 1 FROM abono a2
                WHERE a2.folio = a1.folio
                AND a2.id <> a1.id
                AND a2.identificador_abono <> '' 
                AND a2.identificador_abono IS NOT NULL
            )
        `);

        console.log(`Deleted ${res.rowCount} redundant empty-ID rows.`);

        // What if duplicate is ID='' vs ID='' (but distinct dates in excel, merged in DB?)
        // If DB has 2 rows matching distinct dates, both ID='', they are valid distinct rows.
        // This query won't touch them because a2.identificador_abono <> '' condition.

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanup();
