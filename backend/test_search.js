const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });
(async () => {
    try {
        const searchTerm = '%acei%';
        console.log(`Buscando: ${searchTerm}`);
        const result = await pool.query("SELECT sku, descripcion FROM producto WHERE sku ILIKE $1 OR descripcion ILIKE $1 LIMIT 5", [searchTerm]);
        console.log('Resultados:', result.rows);
    } catch (e) { console.error('Error DB:', e); }
    finally { pool.end(); }
})();
