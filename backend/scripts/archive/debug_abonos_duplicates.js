require('dotenv').config(); // Load .env from root
const { Pool } = require('pg');

// Force SSL false for this local debugging script
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function analyzeDuplicates() {
    try {
        console.log('--- ANALISIS DE DUPLICADOS DE VENDEDORES (VENTAS vs ABONOS) ---');

        // 1. Obtener lista de vendedores desde Ventas
        // Agrupamos por vendedor_cliente (nombre en la venta)
        const salesStats = await pool.query(`
            SELECT 
                vendedor_cliente as nombre,
                COUNT(*) as total_ventas,
                SUM(valor_total) as monto_ventas
            FROM venta
            GROUP BY vendedor_cliente
            ORDER BY vendedor_cliente
        `);

        // 2. Obtener lista de vendedores desde Abonos
        // Agrupamos por vendedor_cliente (nombre en el abono)
        const abonoStats = await pool.query(`
            SELECT 
                vendedor_cliente as nombre,
                COUNT(*) as total_abonos,
                SUM(monto) as monto_abonos
            FROM abono
            GROUP BY vendedor_cliente
            ORDER BY vendedor_cliente
        `);

        // 3. Cruzar datos
        const map = new Map();

        salesStats.rows.forEach(r => {
            const norm = r.nombre ? r.nombre.trim().toUpperCase() : 'NULL';
            if (!map.has(norm)) map.set(norm, { name: r.nombre, sales: 0, abonos: 0, saleAmount: 0, abonoAmount: 0 });
            const entry = map.get(norm);
            entry.sales += parseInt(r.total_ventas);
            entry.saleAmount += parseFloat(r.monto_ventas || 0);
        });

        abonoStats.rows.forEach(r => {
            const norm = r.nombre ? r.nombre.trim().toUpperCase() : 'NULL';
            if (!map.has(norm)) map.set(norm, { name: r.nombre, sales: 0, abonos: 0, saleAmount: 0, abonoAmount: 0 });
            const entry = map.get(norm);
            entry.abonos += parseInt(r.total_abonos);
            entry.abonoAmount += parseFloat(r.monto_abonos || 0);
        });

        // 4. Mostrar resultados e identificar 'sospechosos'
        // Sospechosos: Vendedores parecidos donde uno tiene ventas pero 0 abonos, 
        // y otro (nombre similar) tiene abonos pero 0 ventas (o viceversa).

        console.log('Nombre | Ventas (#) | Ventas ($) | Abonos (#) | Abonos ($)');
        console.log('-----------------------------------------------------------');

        const allEntries = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

        allEntries.forEach(e => {
            // Formatear montos
            const salesStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(e.saleAmount);
            const abonoStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(e.abonoAmount);

            // Marcar con * si tiene mismatch fuerte (muchas ventas 0 abono, o al reves)
            let alert = '';
            if (e.sales > 0 && e.abonos === 0) alert = ' <--- (Posible duplicado Ventas, falta Abonos)';
            if (e.sales === 0 && e.abonos > 0) alert = ' <--- (Solo Abonos, posible duplicado)';

            console.log(`${e.name.padEnd(30)} | ${e.sales.toString().padStart(5)} | ${salesStr.padStart(15)} | ${e.abonos.toString().padStart(5)} | ${abonoStr.padStart(15)}${alert}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

analyzeDuplicates();
