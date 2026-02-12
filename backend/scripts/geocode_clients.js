const pool = require('../src/db');
const geocodingService = require('../src/services/geocoding');

async function batchGeocodeClients() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando Geocodificación Masiva de Clientes...');

        // 1. Obtener clientes de terreno sin coordenadas
        const res = await client.query(`
            SELECT id, rut, nombre, direccion, numero, comuna, ciudad
            FROM cliente
            WHERE es_terreno = TRUE 
            AND (latitud IS NULL OR longitud IS NULL)
            LIMIT 10 
        `);

        const clients = res.rows;
        console.log(`📍 Encontrados ${clients.length} clientes pendientes de geocodificación.`);

        if (clients.length === 0) {
            console.log('✅ No hay clientes pendientes.');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const c of clients) {
            // Construir dirección: Calle Numero, Comuna, Ciudad, Chile
            const fullAddress = `${c.direccion || ''} ${c.numero || ''}, ${c.comuna || ''}, ${c.ciudad || ''}, Chile`.replace(/ ,/g, ',');
            console.log(`🔍 Geocodificando cliente [${c.rut}] ${c.nombre}: ${fullAddress}`);

            try {
                const coords = await geocodingService.geocodeAddress(fullAddress);

                if (coords) {
                    await client.query(`
                        UPDATE cliente
                        SET latitud = $1, longitud = $2
                        WHERE id = $3
                    `, [coords.lat, coords.lng, c.id]);
                    console.log(`   ✅ Coordenadas guardadas: ${coords.lat}, ${coords.lng}`);
                    successCount++;
                } else {
                    console.log('   ⚠️ No se pudieron obtener coordenadas.');
                    errorCount++;
                }
            } catch (err) {
                console.error(`   ❌ Error procesando cliente ${c.id}:`, err.message);
                errorCount++;
            }

            // Pausa de 200ms
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('🏁 Proceso finalizado.');
        console.log(`   ✅ Exitosos: ${successCount}`);
        console.log(`   ❌ Fallidos: ${errorCount}`);

    } catch (err) {
        console.error('❌ Error general:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    batchGeocodeClients();
}

module.exports = batchGeocodeClients;
