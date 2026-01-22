
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

async function applyManualFix() {
    const client = await pool.connect();
    try {
        const assignments = [
            { original: "Alejandra Del Carmen Mery Hern√°ndez", target: "Luis" },
            { original: "Alejandro Mauricio Valdivia Valdivia", target: "Matias Felipe" },
            { original: "Francisco   Fredes", target: "Maiko" },
            { original: "Matias Ignacio Ignacio Tapia Duran", target: "Eduardo Rojas" },
            { original: "Octavio Enrique Contreras Acevedo", target: "Joaquin" },
            { original: "Tamara Isabel Lillo Avalos", target: "Luis" }
        ];

        console.log('🚀 Aplicando asignaciones manuales finales...');

        for (const a of assignments) {
            const res = await client.query(
                "UPDATE cliente SET nombre_vendedor = $1 WHERE nombre_vendedor = $2",
                [a.target, a.original]
            );
            console.log(`✅ [${a.target}]: ${res.rowCount} registros actualizados para "${a.original}"`);
        }

        console.log('\n🎉 Proceso completado.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        pool.end();
    }
}

applyManualFix();
