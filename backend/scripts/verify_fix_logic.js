require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        console.log('--- Verificando Lógica Híbrida (COALESCE) ---');

        const res = await pool.query(`
        SELECT 
            SUM(monto) as total_bruto,
            
            -- Lógica anterior (fallaba por Nulos)
            SUM(monto_neto) as total_neto_solo_columna,
            
            -- Lógica de "Doble División" (lo que se quería evitar)
            -- (En realidad, el bug era que se dividía lo que ya era neto, pero aqui simulamos el calculo puro)
            SUM(monto / 1.19) as total_neto_calculado_siempre,
            
            -- Lógica NUEVA (Híbrida)
            SUM(COALESCE(monto_neto, monto / 1.19)) as total_neto_hibrido
        FROM abono
    `);

        const r = res.rows[0];
        const bruto = parseFloat(r.total_bruto);
        const netoCalculado = parseFloat(r.total_neto_calculado_siempre);
        const netoHibrido = parseFloat(r.total_neto_hibrido);

        console.log(`Total Bruto:             $${bruto.toLocaleString()}`);
        console.log(`Total Calculado (/1.19): $${netoCalculado.toLocaleString()}`);
        console.log(`Total Híbrido (Final):   $${netoHibrido.toLocaleString()}`);

        const diff = Math.abs(netoHibrido - netoCalculado);
        console.log(`Diferencia vs Calculado: $${diff.toLocaleString()}`);

        if (diff < (bruto * 0.01)) { // Diferencia menor al 1% es aceptable (variaciones de redondeo vs dato almacenado)
            console.log('✅ La lógica híbrida es consistente y recupera los datos nulos.');
        } else {
            console.log('⚠️ Diferencia significativa. Revisar si monto_neto almacenado difiere mucho del cálculo teórico.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

verify();
