
const pool = require('./src/db');

async function checkCounts() {
    try {
        const clients = await pool.query('SELECT COUNT(*) FROM cliente');
        const products = await pool.query('SELECT COUNT(*) FROM producto');
        const sales = await pool.query('SELECT COUNT(*) FROM venta');
        const abonos = await pool.query('SELECT COUNT(*) FROM abono');
        const saldo = await pool.query('SELECT COUNT(*) FROM saldo_credito');

        console.log('--- DIAGNOSTICO DE BASE DE DATOS ---');
        console.log(`Clientes:       ${clients.rows[0].count}`);
        console.log(`Productos:      ${products.rows[0].count}`);
        console.log(`Ventas:         ${sales.rows[0].count}`);
        console.log(`Abonos:         ${abonos.rows[0].count}`);
        console.log(`Saldo Credito:  ${saldo.rows[0].count}`);
        console.log('------------------------------------');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkCounts();
