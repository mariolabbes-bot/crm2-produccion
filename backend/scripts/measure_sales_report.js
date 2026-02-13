
require('dotenv').config({ path: '/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function measureSalesReport() {
    try {
        console.log('--- STARTING SALES REPORT MEASUREMENT ---');
        console.time('Total Execution');

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const startCurrent = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endCurrent = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
        const startLastYear = `${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-01`;
        const endLastYear = new Date(currentYear - 1, currentMonth, 0).toISOString().split('T')[0];
        const start6m = new Date(currentYear, currentMonth - 7, 1).toISOString().split('T')[0];
        const end6m = new Date(currentYear, currentMonth - 1, 0).toISOString().split('T')[0];

        const queryParams = [startCurrent, endCurrent, startLastYear, endLastYear, start6m, end6m];

        // Simulate "Manager" viewing all or specific vendor
        // Case 1: All vendors (Manager view)
        console.time('Query: All Vendors');
        const queryAll = `
            WITH ventas_agrupadas AS (
                SELECT 
                    cp.sku,
                    cp.descripcion,
                    cp.litros,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $1 AND $2 THEN v.cantidad ELSE 0 END) as qty_actual,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $1 AND $2 THEN v.valor_total ELSE 0 END) as monto_actual,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $3 AND $4 THEN v.cantidad ELSE 0 END) as qty_anio_ant,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $5 AND $6 THEN v.cantidad ELSE 0 END) as qty_6m
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                WHERE (v.fecha_emision BETWEEN $1 AND $2 
                   OR v.fecha_emision BETWEEN $3 AND $4 
                   OR v.fecha_emision BETWEEN $5 AND $6)
                GROUP BY cp.sku, cp.descripcion, cp.litros
            )
            SELECT * FROM ventas_agrupadas LIMIT 20
        `;
        await pool.query(queryAll, queryParams);
        console.timeEnd('Query: All Vendors');

        // Case 2: Specific Vendor (matches by name string!)
        // Need a valid vendor name. Using 'Juan Perez' as dummy or try to find one.
        // I will just use the query structure with a dummy parameter to test the JOIN performance.
        console.time('Query: Specific Vendor Filter');
        const paramsWithVendor = [...queryParams, 'Juan Perez'];
        const queryFilter = `
            WITH ventas_agrupadas AS (
                SELECT 
                    cp.sku,
                    cp.descripcion,
                    cp.litros,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $1 AND $2 THEN v.cantidad ELSE 0 END) as qty_actual,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $1 AND $2 THEN v.valor_total ELSE 0 END) as monto_actual,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $3 AND $4 THEN v.cantidad ELSE 0 END) as qty_anio_ant,
                    SUM(CASE WHEN v.fecha_emision BETWEEN $5 AND $6 THEN v.cantidad ELSE 0 END) as qty_6m
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                LEFT JOIN usuario u_filt ON UPPER(TRIM(u_filt.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
                LEFT JOIN usuario u2_filt ON UPPER(TRIM(u2_filt.alias)) = UPPER(TRIM(v.vendedor_documento))
                WHERE (v.fecha_emision BETWEEN $1 AND $2 
                   OR v.fecha_emision BETWEEN $3 AND $4 
                   OR v.fecha_emision BETWEEN $5 AND $6)
                AND COALESCE(u_filt.rut, u2_filt.rut) = $7
                GROUP BY cp.sku, cp.descripcion, cp.litros
            )
            SELECT * FROM ventas_agrupadas LIMIT 20
        `;
        await pool.query(queryFilter, paramsWithVendor);
        console.timeEnd('Query: Specific Vendor Filter');

        console.timeEnd('Total Execution');
        console.log('--- END ---');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

measureSalesReport();
