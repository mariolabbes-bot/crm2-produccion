const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });

(async () => {
    try {
        console.log("Iniciando migración de tabla sucursal_alias...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sucursal_alias (
                id SERIAL PRIMARY KEY,
                valor_excel VARCHAR(255) UNIQUE NOT NULL,
                sucursal_real VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabla sucursal_alias creada con éxito.");

        // Insertar mapeo base por defecto
        console.log("Insertando mappings por defecto (001 -> CASA MATRIZ)...");
        await pool.query(`
            INSERT INTO sucursal_alias (valor_excel, sucursal_real)
            VALUES 
                ('001', 'CASA MATRIZ'),
                ('002', 'LOS CARRERA'),
                ('003', 'COLON'),
                ('004', 'OHIGGINS'),
                ('005', 'CALAMA'),
                ('006', 'IQUIQUE')
            ON CONFLICT (valor_excel) DO NOTHING;
        `);
        console.log("✅ Mappings por defecto insertados.");

    } catch (e) {
        console.error("❌ Error en migración:", e);
    } finally {
        pool.end();
    }
})();
