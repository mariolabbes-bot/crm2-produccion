const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });

(async () => {
    try {
        console.log("Cargando mapeo de Bodegas a Sucursales...");
        const mappings = [
            { excel: 'Linares', oficial: 'Linares' },
            { excel: 'Local Geronimo', oficial: 'Geronimo Mendez' },
            { excel: 'Planta Geronimo', oficial: 'Geronimo Mendez' },
            { excel: 'Ovalle', oficial: 'Ovalle' },
            { excel: 'Rojas Magallanes', oficial: 'Rojas Magallanes' },
            { excel: 'Antillanca', oficial: 'Antillanca' },
            { excel: 'Talca', oficial: 'Geronimo Mendez' },
            { excel: 'Bodega Recauchaje', oficial: 'Geronimo Mendez' },
            { excel: 'Muetras de Neumaticos', oficial: 'Antillanca' }
        ];

        let insertCount = 0;
        for (const m of mappings) {
            const res = await pool.query(`
                INSERT INTO sucursal_alias (valor_excel, sucursal_real)
                VALUES ($1, $2)
                ON CONFLICT (valor_excel) DO UPDATE SET sucursal_real = EXCLUDED.sucursal_real
            `, [m.excel.trim().toUpperCase(), m.oficial.trim().toUpperCase()]);
            // Convert to uppercase for robustness, though the resolver handles uppercase anyway
            // Wait, the UI usually lets the user input literal values. Let's insert exactly what's in the image.
            insertCount++;
        }
        
        console.log(`✅ Se insertaron/actualizaron ${insertCount} mapeos de Bodegas a Sucursales.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        pool.end();
    }
})();
