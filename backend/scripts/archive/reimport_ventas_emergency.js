require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FILES = [
    'VENTAS 2024.xlsx',
    'VENTAS 2025.xlsx',
    'VENTAS_19-01-2026.xlsx'
];
const BULK_DIR = path.join(__dirname, '../bulk_data');
const BATCH_SIZE = 2000;

async function reimportVentas() {
    const client = await pool.connect();
    try {
        console.log('--- EMERGENCY RE-IMPORT OF VENTAS (FULL RELOAD) ---');

        // 0. Prefetch Vendor Mapping (Alias -> Full Name)
        // 0. Prefetch Vendor Mapping (Alias -> Full Name)
        console.log('Fetching user mapping for standardization...');
        // Prioritize Real Users (length > stub) and ensure we don't overwrite good names with bad ones
        const userRes = await client.query("SELECT alias, nombre_vendedor, rut FROM usuario ORDER BY length(nombre_vendedor) DESC");
        const aliasMap = new Map();

        userRes.rows.forEach(u => {
            const fullName = u.nombre_vendedor;
            const isStub = u.rut.startsWith('STUB');

            const addMapping = (keyRaw) => {
                if (!keyRaw) return;
                const key = keyRaw.toLowerCase().trim();

                // If it's a stub, only add if strictly new (don't overwrite anything)
                if (isStub) {
                    if (!aliasMap.has(key)) aliasMap.set(key, fullName);
                } else {
                    // If it's a real user, always overwrite (rule of thumb: real user > stub)
                    // But if we already have a real user, longest name wins (handled by ORDER BY)
                    aliasMap.set(key, fullName);
                }
            };

            addMapping(u.alias);
            addMapping(u.nombre_vendedor);
        });

        // 1. TRUNCATE
        console.log('⚠️  TRUNCATING table "venta"...');
        await client.query('TRUNCATE TABLE venta RESTART IDENTITY');
        console.log('✅  Table truncated.');

        for (const fileName of FILES) {
            const filePath = path.join(BULK_DIR, fileName);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ File not found: ${fileName} (Skipping)`);
                continue;
            }

            console.log(`\n📂 Reading file: ${fileName}`);
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const headers = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null })[0];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 1, defval: null });

            console.log(`📊 Found ${rows.length} rows.`);

            const findCol = (regex) => headers.findIndex(h => regex.test(String(h)));

            const idxFolio = findCol(/Folio/i);
            const idxFecha = findCol(/Fecha/i);
            const idxCliente = findCol(/Cliente/i);
            const idxVendedor = findCol(/Vendedor.*cl/i) > -1 ? findCol(/Vendedor.*cl/i) : findCol(/Vendedor/i);
            const idxTotal = findCol(/Total|Monto|Valor|vebtas/i); // Added 'vebtas'
            const idxItem = findCol(/Item|Descripci/i);
            const idxCant = findCol(/Cant/i);
            const idxPrecio = findCol(/Precio/i);

            console.log(`Indices: Folio=${idxFolio}, Fecha=${idxFecha}, Vend=${idxVendedor}, Tot=${idxTotal}`);

            if (idxFolio === -1) {
                console.error('❌ Critical column FOLIO missing. Skipping file.');
                continue;
            }

            const validItems = [];
            for (const row of rows) {
                if (!row[idxFolio]) continue;

                const fechaRaw = row[idxFecha];
                let fecha = null;
                if (typeof fechaRaw === 'number') {
                    fecha = new Date(Math.round((fechaRaw - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
                } else {
                    fecha = '2024-01-01'; // Fallback
                }

                const cant = row[idxCant] ? Number(row[idxCant]) : 1;
                const precio = row[idxPrecio] ? Number(row[idxPrecio]) : 0;
                let total = 0;
                if (idxTotal > -1) {
                    total = row[idxTotal] || 0;
                } else {
                    total = cant * precio;
                }

                // Vendor Standardization
                let vendedorRaw = String(row[idxVendedor] || '').trim();
                let vendedorFinal = vendedorRaw;
                if (vendedorRaw) {
                    const lower = vendedorRaw.toLowerCase();
                    if (aliasMap.has(lower)) {
                        vendedorFinal = aliasMap.get(lower);
                    }
                }

                validItems.push({
                    folio: String(row[idxFolio]),
                    fecha: fecha,
                    cliente: String(row[idxCliente] || 'Unknown').trim(),
                    vendedor: vendedorFinal,
                    total: total,
                    desc: String(row[idxItem] || ''),
                    cant: cant,
                    precio: precio
                });
            }

            console.log(`✅ Valid items: ${validItems.length}`);

            for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
                const batch = validItems.slice(i, i + BATCH_SIZE);
                const values = [];
                const placeholders = [];
                let k = 1;

                batch.forEach(item => {
                    placeholders.push(`($${k}, $${k + 1}, $${k + 2}, $${k + 3}, $${k + 4}, $${k + 5}, $${k + 6}, $${k + 7})`);
                    values.push(item.folio, item.fecha, item.cliente, item.vendedor, item.total, item.desc, item.cant, item.precio);
                    k += 8;
                });

                const query = `
                    INSERT INTO venta (folio, fecha_emision, cliente, vendedor_cliente, valor_total, descripcion, cantidad, precio) 
                    VALUES ${placeholders.join(', ')}
                `;

                await client.query(query, values);
                process.stdout.write(`\r🚀 Inserted: ${i + batch.length} / ${validItems.length}`);
            }
            console.log('\n✅ File done.');
        }

    } catch (err) {
        console.error('\nFATAL ERROR:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

reimportVentas();
