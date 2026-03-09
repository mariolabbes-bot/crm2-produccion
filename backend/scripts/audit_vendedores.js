const { Pool } = require('pg');
require('dotenv').config({ path: '/Users/mariolabbe/Desktop/TRABAJO IA/CRM2/backend/.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runAudit() {
    try {
        console.log("=== INICIANDO AUDITORÍA DE VENDEDORES ===");

        // 1. Usuarios Oficiales (Vendedores y Managers)
        console.log("\n1. USUARIOS CON ROL VENDEDOR O MANAGER EN LA DB:");
        const usersRes = await pool.query(`
      SELECT rut, nombre_vendedor, alias, rol_usuario, sucursal, email
      FROM usuario
      WHERE LOWER(rol_usuario) IN ('vendedor', 'manager') AND nombre_vendedor IS NOT NULL
      ORDER BY nombre_vendedor
    `);
        console.table(usersRes.rows);

        // 2. Mapeos de Alias (si existe la tabla)
        console.log("\n2. TABLA DE ALIAS (usuario_alias) SI EXISTE:");
        const aliasExists = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usuario_alias'
      ) AS exists
    `);
        if (aliasExists.rows[0].exists) {
            const aliasRes = await pool.query('SELECT alias, nombre_vendedor_oficial FROM usuario_alias ORDER BY nombre_vendedor_oficial');
            console.table(aliasRes.rows);
        } else {
            console.log("No existe la tabla 'usuario_alias'.");
        }

        // 3. Ventas de los últimos 3 meses agrupadas por vendedor_cliente
        console.log("\n3. VENTAS DE LOS ÚLTIMOS 3 MESES POR VENDEDOR DE LA BASE DE DATOS (Diciembre 2025 - Febrero 2026):");
        const salesRes = await pool.query(`
      SELECT 
        COALESCE(vendedor_cliente, 'NULO/VACIO') as vendedor_str_en_db, 
        COUNT(*) as total_transacciones, 
        SUM(valor_total) as monto_total_ventas
      FROM venta 
      WHERE fecha_emision >= '2025-12-01' AND fecha_emision <= '2026-02-28'
      GROUP BY vendedor_cliente 
      ORDER BY monto_total_ventas DESC
    `);
        console.table(salesRes.rows);

        // 4. Abonos de los últimos 3 meses agrupados por vendedor_cliente
        console.log("\n4. ABONOS DE LOS ÚLTIMOS 3 MESES POR VENDEDOR DE LA BASE DE DATOS (Diciembre 2025 - Febrero 2026):");
        const abonosRes = await pool.query(`
      SELECT 
        COALESCE(vendedor_cliente, 'NULO/VACIO') as vendedor_str_en_db, 
        COUNT(*) as total_transacciones, 
        SUM(monto) as monto_total_abonos
      FROM abono 
      WHERE fecha >= '2025-12-01' AND fecha <= '2026-02-28'
      GROUP BY vendedor_cliente 
      ORDER BY monto_total_abonos DESC
    `);
        console.table(abonosRes.rows);

    } catch (err) {
        console.error("Error en auditoría:", err);
    } finally {
        pool.end();
    }
}

runAudit();
