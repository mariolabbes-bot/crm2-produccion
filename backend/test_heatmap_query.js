const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: { rejectUnauthorized: false }
});

async function testHeatmap() {
    try {
        console.log('--- TEST 1: Manager sin vendedor_id (Debería traer todos) ---');
        const res1 = await pool.query('SELECT COUNT(*) FROM cliente WHERE es_terreno = true');
        console.log('Total es_terreno en BD:', res1.rows[0].count);

        const query = `
            WITH stats AS (
                SELECT 
                    c.id, c.rut, c.nombre, c.latitud, c.longitud, c.vendedor_id
                FROM cliente c
                WHERE ($1::int IS NULL OR c.vendedor_id = $1) AND c.es_terreno = true
            )
            SELECT * FROM stats
        `;

        const res2 = await pool.query(query, [null]);
        console.log('Resultados Test 1 (null):', res2.rows.length);

        console.log('\n--- TEST 2: Filtrado por Eduardo Rojas (ID 11) ---');
        const res3 = await pool.query(query, [11]);
        console.log('Resultados Test 2 (ID 11):', res3.rows.length);
        if (res3.rows.length > 0) {
            console.log('Ejemplo:', res3.rows[0]);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testHeatmap();
