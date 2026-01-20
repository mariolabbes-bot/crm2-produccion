require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function deepInspect() {
    try {
        console.log('--- INSPECCIÓN PROFUNDA DE DATOS ---');

        // 1. VENTAS: Distribución por Año-Mes (Todos los tiempos)
        console.log('\n[VENTAS] Distribución Mensual (Todas las fechas):');
        const datesRes = await pool.query(`
      SELECT 
        TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
        COUNT(*) as cantidad
      FROM venta
      GROUP BY 1
      ORDER BY 1 DESC;
    `);
        console.table(datesRes.rows);

        // 2. VENDEDORES: Análisis de cadenas (Hex Dump) para detectar diferencias sutiles
        console.log('\n[VENDEDORES] Análisis de Nombres "Duplicados":');
        // Buscamos nombres que sean visualmente similares
        const vendorRes = await pool.query(`
      SELECT 
        rut, 
        nombre_vendedor, 
        LENGTH(nombre_vendedor) as len,
        encode(convert_to(nombre_vendedor, 'UTF8'), 'hex') as hex_dump
      FROM usuario
      WHERE LOWER(rol_usuario) = 'vendedor'
      ORDER BY nombre_vendedor;
    `);

        // Mostramos solo si hay nombres repetidos (case insensitive)
        const seen = {};
        vendorRes.rows.forEach(r => {
            const key = r.nombre_vendedor.toLowerCase().trim();
            if (!seen[key]) seen[key] = [];
            seen[key].push(r);
        });

        Object.keys(seen).forEach(k => {
            if (seen[k].length > 1) {
                console.log(`\nConflict: "${k}"`);
                console.table(seen[k].map(i => ({
                    rut: i.rut,
                    nombre: `"${i.nombre_vendedor}"`,
                    len: i.len,
                    hex: i.hex_dump
                })));
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

deepInspect();
