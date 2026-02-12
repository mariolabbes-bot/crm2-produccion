const pool = require('./src/db');
async function findUser() {
    try {
        const res = await pool.query("SELECT id, nombre_completo, nombre_vendedor FROM usuario WHERE nombre_vendedor ILIKE '%Eduardo Rojas%' OR nombre_completo ILIKE '%Eduardo Rojas%'");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findUser();
