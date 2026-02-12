const pool = require('./src/db');
async function checkTables() {
    try {
        const tables = ['visit_plans', 'cliente_actividad', 'cliente'];
        for (const table of tables) {
            const res = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);
            console.log(`Table "${table}" exists: ${res.rows[0].exists}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error checking tables:', err);
        process.exit(1);
    }
}
checkTables();
