require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/db');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runGeocoding() {
    if (!GOOGLE_API_KEY) {
        console.error("❌ ERROR: No se encontró GOOGLE_MAPS_API_KEY en .env");
        return;
    }

    const client = await pool.connect();
    try {
        console.log("🚀 Iniciando Motor de Geolocalización y Asignación de Terreno...");

        let targetRuts = new Set();

        // 1. Cargar RUTs del Excel Base (Candidatos Mapeados)
        const excelPath = path.join(__dirname, '../outputs/candidatos_en_terreno.xlsx');
        if (fs.existsSync(excelPath)) {
            const workbook = XLSX.readFile(excelPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            data.forEach(row => {
                if (row.RUT) targetRuts.add(row.RUT.trim());
            });
            console.log(`✅ ${data.length} RUTs cargados desde el Excel base.`);
        } else {
            console.warn("⚠️ No se encontró el Excel base 'candidatos_en_terreno.xlsx'");
        }

        // 2. Cargar RUTs Adicionales (Eduardo Rojas)
        const jsonPath = path.join(__dirname, '../outputs/ruts_adicionales_terreno.json');
        if (fs.existsSync(jsonPath)) {
            const extraRuts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            extraRuts.forEach(rut => targetRuts.add(rut.trim()));
            console.log(`✅ ${extraRuts.length} RUTs cargados desde el JSON adicional.`);
        }

        const rutArray = Array.from(targetRuts);
        console.log(`🎯 Total a Procesar (Desduplicados): ${rutArray.length} clientes.`);

        if (rutArray.length === 0) {
            console.log("❌ No hay RUTs para procesar.");
            return;
        }

        console.log(`⚡ MARCANDO a los ${rutArray.length} clientes como "EN TERRENO"...`);
        // Actualización masiva de la columna categoría ("EN TERRENO") independientemente de las coordenadas
        for (let i = 0; i < rutArray.length; i += 100) {
            const batch = rutArray.slice(i, i + 100);
            const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(', ');
            await client.query(`UPDATE cliente SET categoria = 'EN TERRENO' WHERE rut IN (${placeholders})`, batch);
        }
        console.log(`✅ Todos los clientes objetivo fueron etiquetados EN TERRENO exitosamente.`);

        // 3. Buscar a los que les faltan coordenadas
        // Utilizamos marcadores posicionales (como placeholders pero pasándolo via JOIN y ANY)
        console.log(`🔍 Buscando clientes EN TERRENO que necesitan Geolocalización (Lat/Lon vacíos)...`);

        const placeholders = rutArray.map((_, i) => `$${i + 1}`).join(', ');
        const missingCoordsRes = await client.query(`
            SELECT rut, nombre, direccion, comuna, ciudad 
            FROM cliente 
            WHERE rut IN (${placeholders}) 
              AND (latitud IS NULL OR longitud IS NULL)
              AND direccion IS NOT NULL AND direccion != ''
        `, rutArray);

        const clientsToGeocode = missingCoordsRes.rows;
        console.log(`📍 Clientes que requieren consulta a Google Geocoding API: ${clientsToGeocode.length}`);

        if (clientsToGeocode.length === 0) {
            console.log("🎉 Todos los clientes objetivo ya tienen coordenadas. ¡Finalizado!");
            return;
        }

        let exito = 0;
        let fallos = 0;

        for (let i = 0; i < clientsToGeocode.length; i++) {
            const c = clientsToGeocode[i];
            // Construir la dirección completa. Ej: "Av. Providencia 1234, Providencia, Santiago, Chile"
            const direccionCompleta = `${c.direccion}, ${c.comuna || ''}, ${c.ciudad || ''}, Chile`.replace(/,\s*,/g, ',');

            console.log(`[${i + 1}/${clientsToGeocode.length}] Geocodificando: ${c.rut} - ${direccionCompleta}`);

            try {
                // LLAMADA A LA API DE GOOGLE
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccionCompleta)}&key=${GOOGLE_API_KEY}`;

                // Usamos fetch nativo de Node
                const response = await fetch(url);
                const json = await response.json();

                if (json.status === 'OK' && json.results.length > 0) {
                    const location = json.results[0].geometry.location;
                    const lat = location.lat;
                    const lng = location.lng;

                    // Guardar en DB
                    await client.query('UPDATE cliente SET latitud = $1, longitud = $2 WHERE rut = $3', [lat, lng, c.rut]);
                    console.log(`   🟢 [OK] Lat: ${lat}, Lng: ${lng}`);
                    exito++;
                } else if (json.status === 'ZERO_RESULTS') {
                    console.warn(`   🟡 [NO MATCH] Google no encontró esta dirección.`);
                    fallos++;
                } else {
                    console.error(`   🔴 [ERROR GOOGLE] ${json.status} - ${json.error_message || ''}`);
                    fallos++;
                }

                // Rate Limit Básico para no quemar la API de golpe (5 peticiones por s)
                await sleep(200);

            } catch (err) {
                console.error(`   🔴 [ERROR] Falla de Red: ${err.message}`);
                fallos++;
            }
        }

        console.log("\n=========================================");
        console.log("🏁 PROCESO FINALIZADO");
        console.log(`✅ Geocodificados: ${exito}`);
        console.log(`❌ Fallidos/No Encontrados: ${fallos}`);
        console.log("=========================================\n");

    } catch (e) {
        console.error("❌ Error Crítico:", e);
    } finally {
        client.release();
        pool.end();
    }
}

runGeocoding();
