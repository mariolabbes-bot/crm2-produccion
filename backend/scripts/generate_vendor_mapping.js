require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function generateMapping() {
    try {
        console.log('--- GENERANDO PLANTILLA DE MAPEO ---');

        // 1. Get Real Users (Vendedores)
        const usersRes = await pool.query(`
        SELECT rut, nombre_vendedor, correo 
        FROM usuario 
        WHERE LOWER(rol_usuario) = 'vendedor'
        ORDER BY nombre_vendedor
    `);

        // 2. Get Sales Vendor Names
        const salesRes = await pool.query(`
        SELECT DISTINCT vendedor_cliente 
        FROM venta 
        WHERE vendedor_cliente IS NOT NULL 
        ORDER BY vendedor_cliente
    `);

        // 3. Create CSV Content
        // Format: RUT, NOMBRE_USUARIO_LOGIN, CORREO, MATCH_VENTAS_SUGERIDO
        let csvContent = "RUT_USUARIO,NOMBRE_USUARIO_LOGIN,CORREO,ASIGNAR_NOMBRE_VENTAS_EXACTO\n";

        const salesNames = new Set(salesRes.rows.map(r => r.vendedor_cliente));

        usersRes.rows.forEach(u => {
            // Try to find a suggestion
            const firstWord = u.nombre_vendedor.split(' ')[0];
            let suggestion = '';

            // Exact match?
            if (salesNames.has(u.nombre_vendedor)) {
                suggestion = u.nombre_vendedor;
            }
            // First word match?
            else {
                for (const sName of salesNames) {
                    if (sName.toLowerCase() === firstWord.toLowerCase()) {
                        suggestion = sName;
                        break;
                    }
                }
            }

            csvContent += `${u.rut},"${u.nombre_vendedor || ''}",${u.correo || ''},"${suggestion}"\n`;
        });

        // Add a section of "Unmatched Sales Names" for reference
        csvContent += "\n\n--- NOMBRES EN VENTAS (REFERENCIA) ---\n";
        salesRes.rows.forEach(r => {
            csvContent += `,,,"${r.vendedor_cliente}"\n`;
        });

        const outputPath = path.join(__dirname, '../outputs/mapeo_vendedores.csv');
        // Ensure dir exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(outputPath, csvContent);
        console.log(`✅ Archivo generado: ${outputPath}`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

generateMapping();
