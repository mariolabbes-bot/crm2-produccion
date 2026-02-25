require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/db');

async function checkVendors() {
    const client = await pool.connect();
    try {
        console.log("--- VENDORS EN TABLA USUARIO ---");
        const usersRes = await client.query('SELECT alias, nombre_completo, nombre_vendedor FROM usuario ORDER BY nombre_vendedor');
        console.table(usersRes.rows);

        console.log("\n--- VENDORS DISTINCTOS EN TABLA CLIENTE ---");
        const clientRes = await client.query('SELECT DISTINCT nombre_vendedor FROM cliente WHERE nombre_vendedor IS NOT NULL ORDER BY nombre_vendedor');
        console.log(clientRes.rows.map(r => `'${r.nombre_vendedor}'`));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
checkVendors();
