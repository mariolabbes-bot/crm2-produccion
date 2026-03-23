const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });

(async () => {
    try {
        console.log("Consultando sucursales únicas en tabla VENTA...");
        const ventas = await pool.query(`SELECT DISTINCT sucursal FROM venta WHERE sucursal IS NOT NULL`);
        console.log("Sucursales en ventas:", ventas.rows.map(r => r.sucursal));

        console.log("\nConsultando llaves en stock_por_sucursal en tabla PRODUCTO...");
        const stockSample = await pool.query(`SELECT stock_por_sucursal FROM producto WHERE stock_por_sucursal IS NOT NULL LIMIT 5`);
        stockSample.rows.forEach(r => {
            console.log(Object.keys(r.stock_por_sucursal), '->', r.stock_por_sucursal);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        pool.end();
    }
})();
