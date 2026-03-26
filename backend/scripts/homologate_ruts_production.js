require('dotenv').config();
const pool = require('../src/db');

function formatRut(rut) {
    if (!rut) return null;
    let clean = String(rut).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body}-${dv}`;
}

async function homologate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando Homologación de RUTs...');
        await client.query('BEGIN');

        // 1. CLIENTE
        console.log('Updating CLIENTE...');
        const clients = await client.query("SELECT rut FROM cliente WHERE rut IS NOT NULL");
        for (const row of clients.rows) {
            const newRut = formatRut(row.rut);
            if (newRut !== row.rut) {
                await client.query("UPDATE cliente SET rut = $1 WHERE rut = $2", [newRut, row.rut]);
            }
        }

        // 2. VENTA (identificador)
        console.log('Updating VENTA...');
        // Only update where format is not already XXXXXXX-X and avoid huge updates if not needed
        const ventas = await client.query("SELECT DISTINCT identificador FROM venta WHERE identificador IS NOT NULL AND identificador NOT LIKE '%-%'");
        for (const row of ventas.rows) {
            const newRut = formatRut(row.identificador);
            await client.query("UPDATE venta SET identificador = $1 WHERE identificador = $2", [newRut, row.identificador]);
        }

        // 3. ABONO (identificador)
        console.log('Updating ABONO...');
        const abonos = await client.query("SELECT DISTINCT identificador FROM abono WHERE identificador IS NOT NULL AND identificador NOT LIKE '%-%'");
        for (const row of abonos.rows) {
            const newRut = formatRut(row.identificador);
            await client.query("UPDATE abono SET identificador = $1 WHERE identificador = $2", [newRut, row.identificador]);
        }

        // 4. SALDO_CREDITO
        console.log('Updating SALDO_CREDITO...');
        const saldos = await client.query("SELECT rut, dv, id FROM saldo_credito");
        for (const row of saldos.rows) {
            // Check if we need to combine rut + dv
            let base = row.rut || '';
            if (row.dv && !base.includes(row.dv)) {
                base = base + row.dv;
            }
            const newRut = formatRut(base);
            if (newRut !== row.rut) {
                await client.query("UPDATE saldo_credito SET rut = $1 WHERE id = $2", [newRut, row.id]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Homologación completada con éxito.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

homologate();
