const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const FILES = [
    { path: path.join(__dirname, '../bulk_data/VENTAS 2025.xlsx'), year: 2025, month: 0 },
    { path: path.join(__dirname, '../bulk_data/IMPORTACION 21-01-2026/VENTAS.xlsx'), year: 2026, month: 0 }
];

const val = (row, keyPattern) => {
    // 1. Try exact includes
    let foundKey = Object.keys(row).find(k => k.toLowerCase().includes(keyPattern.toLowerCase()));

    // 2. Fallbacks
    if (!foundKey) {
        if (keyPattern === 'familia') {
            foundKey = Object.keys(row).find(k => k.toLowerCase().includes('nea') && !k.toLowerCase().includes('sub'));
        } else if (keyPattern === 'subfamilia') {
            foundKey = Object.keys(row).find(k => k.toLowerCase().includes('sublinea') || k.toLowerCase().includes('subl'));
        } else if (keyPattern === 'fecha') {
            foundKey = Object.keys(row).find(k => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('emisi'));
        } else if (keyPattern === 'cantidad') {
            foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'cantidad');
        }
    }
    return row[foundKey];
};

const normalize = (str) => String(str || '').toUpperCase().trim();

async function audit() {
    console.log('--- AUDITORÍA FINAL EXCEL vs BD ---\n');

    for (const file of FILES) {
        console.log(`📂 Analizando archivo: ${path.basename(file.path)} (Año ${file.year})`);

        try {
            const workbook = XLSX.readFile(file.path);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            // Filter month
            let monthRows = data.filter(r => {
                const dateVal = val(r, 'fecha');
                if (!dateVal) return false;
                if (typeof dateVal === 'number') {
                    const dateObj = XLSX.SSF.parse_date_code(dateVal);
                    return dateObj.y === file.year && dateObj.m === (file.month + 1);
                } else {
                    const d = new Date(dateVal);
                    if (!isNaN(d)) return d.getFullYear() === file.year && d.getMonth() === file.month;
                }
                return false;
            });

            if (monthRows.length === 0 && data.length > 0) monthRows = data; // Fallback

            // RESULTADOS EXCEL
            // 1. LUBRICANTES (Unidades)
            // Familia: Lubricantes
            const lubs = monthRows.filter(r => normalize(val(r, 'familia')).includes('LUBRICANTE'));
            const lubsQty = lubs.reduce((sum, r) => sum + (parseFloat(val(r, 'cantidad')) || 0), 0);

            // 2. TBR APLUS
            // Subfamilia: TBR (or Camion Ligero if mapping needed, assume user wants strict TBR)
            // Note from inspect: 'Neum√°ticos VAN y Cami√≥n Ligero' might be TBR? Or 'Neumaticos TBR' in other rows.
            // User asked for 'TBR', so we look for 'TBR' OR 'CAMION' if that's the equivalent, but prompt says TBR.
            // Let's stick to 'TBR' string match.
            const tbr = monthRows.filter(r =>
                (normalize(val(r, 'subfamilia')).includes('TBR')) &&
                normalize(val(r, 'marca')).includes('APLUS')
            );
            const tbrQty = tbr.reduce((sum, r) => sum + (parseFloat(val(r, 'cantidad')) || 0), 0);

            // 3. PCR APLUS
            const pcr = monthRows.filter(r =>
                (normalize(val(r, 'subfamilia')).includes('PCR')) &&
                normalize(val(r, 'marca')).includes('APLUS')
            );
            const pcrQty = pcr.reduce((sum, r) => sum + (parseFloat(val(r, 'cantidad')) || 0), 0);

            // 4. REENCAUCHE
            const reenc = monthRows.filter(r => normalize(val(r, 'familia')).includes('REENCAUCHE'));
            const reencQty = reenc.reduce((sum, r) => sum + (parseFloat(val(r, 'cantidad')) || 0), 0);

            console.log(`   📉 EXCEL SUM (${file.year}):`);
            console.log(`      LUBRICANTES: ${lubsQty.toFixed(2)}`);
            console.log(`      TBR APLUS:   ${tbrQty.toFixed(2)}`);
            console.log(`      PCR APLUS:   ${pcrQty.toFixed(2)}`);
            console.log(`      REENCAUCHE:  ${reencQty.toFixed(2)}`);


            // --- DATABASE CHECK ---
            const startStr = `${file.year}-01-01`;
            const endStr = `${file.year}-01-31`;
            console.log(`   🗄️  BD SUM (${startStr} a ${endStr}):`);

            // LUB
            const dbLub = await pool.query(`
                SELECT SUM(v.cantidad) as qty
                FROM venta v JOIN producto p ON v.sku = p.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2 AND UPPER(p.familia) LIKE '%LUBRICANTE%'
            `, [startStr, endStr]);

            // TBR
            const dbTbr = await pool.query(`
                SELECT SUM(v.cantidad) as qty
                FROM venta v JOIN producto p ON v.sku = p.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2 AND UPPER(p.subfamilia) LIKE '%TBR%' AND UPPER(p.marca) = 'APLUS'
            `, [startStr, endStr]);

            // PCR
            const dbPcr = await pool.query(`
                SELECT SUM(v.cantidad) as qty
                FROM venta v JOIN producto p ON v.sku = p.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2 AND UPPER(p.subfamilia) LIKE '%PCR%' AND UPPER(p.marca) = 'APLUS'
            `, [startStr, endStr]);

            // REENCAUCHE
            const dbReenc = await pool.query(`
                SELECT SUM(v.cantidad) as qty
                FROM venta v JOIN producto p ON v.sku = p.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2 AND UPPER(p.familia) LIKE '%REENCAUCHE%'
            `, [startStr, endStr]);

            console.log(`      DB LUB:   ${dbLub.rows[0].qty || 0}`);
            console.log(`      DB TBR:   ${dbTbr.rows[0].qty || 0}`);
            console.log(`      DB PCR:   ${dbPcr.rows[0].qty || 0}`);
            console.log(`      DB REENC: ${dbReenc.rows[0].qty || 0}`);

            // DIFFERENCE
            console.log(`   ⚠️  DIFERENCIA (Excel - BD):`);
            console.log(`      LUB:   ${(lubsQty - (dbLub.rows[0].qty || 0)).toFixed(2)}`);
            console.log(`      TBR:   ${(tbrQty - (dbTbr.rows[0].qty || 0)).toFixed(2)}`);
            console.log(`      PCR:   ${(pcrQty - (dbPcr.rows[0].qty || 0)).toFixed(2)}`);
            console.log(`      REENC: ${(reencQty - (dbReenc.rows[0].qty || 0)).toFixed(2)}`);

        } catch (err) {
            console.error(`   ❌ Error:`, err.message);
        }
        console.log('\n');
    }

    await pool.end();
}

audit();
