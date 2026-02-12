const pool = require('../src/db');
const geocodingService = require('../src/services/geocoding');

const sampleClients = [
    { rut: '77370667-0', circuit: 'CIRCUITO CENTRO' },
    { rut: '12692631-6', circuit: 'CIRCUITO CENTRO' },
    { rut: '17001785-4', circuit: 'CIRCUITO SUR' },
    { rut: '6761138-1', circuit: 'CIRCUITO SUR' },
    { rut: '77206072-6', circuit: 'CIRCUITO SUR' },
    { rut: '16281841-4', circuit: 'CIRCUITO NORTE' },
    { rut: '13728514-2', circuit: 'CIRCUITO NORTE' },
    { rut: '13899974-2', circuit: 'CIRCUITO CENTRO' },
    { rut: '77895156-8', circuit: 'CIRCUITO CENTRO' },
    { rut: '76251665-9', circuit: 'CIRCUITO CENTRO' }
];

async function runPoC() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando PoC de Geocodificación...');

        for (const sample of sampleClients) {
            console.log(`\n🔍 Procesando RUT: ${sample.rut} (${sample.circuit})`);

            // 1. Marcar como terreno y asignar circuito y vendedor_id
            await client.query(
                'UPDATE cliente SET es_terreno = TRUE, circuito = $1, vendedor_id = 11 WHERE rut = $2',
                [sample.circuit, sample.rut]
            );

            // 2. Obtener datos de dirección para geocodificar
            const res = await client.query(
                'SELECT nombre, direccion, numero, comuna, ciudad FROM cliente WHERE rut = $1',
                [sample.rut]
            );

            if (res.rows.length === 0) {
                console.warn(`⚠️ RUT ${sample.rut} no encontrado en la base de datos.`);
                continue;
            }

            const c = res.rows[0];
            const fullAddress = geocodingService.formatAddress(c.direccion, c.numero, c.comuna, c.ciudad);
            console.log(`📍 Dirección formateada: ${fullAddress}`);

            // 3. Geocodificar
            let geoData = await geocodingService.geocodeAddress(fullAddress);

            // Fallback para PoC (Simulación) si falla el API key
            if (!geoData) {
                console.log(`⚠️ Usando coordenadas simuladas para el circuito: ${sample.circuit}`);
                const simulationBases = {
                    'CIRCUITO NORTE': { lat: -33.37, lng: -70.68 },
                    'CIRCUITO CENTRO': { lat: -33.45, lng: -70.65 },
                    'CIRCUITO SUR': { lat: -33.58, lng: -70.62 }
                };
                const base = simulationBases[sample.circuit] || simulationBases['CIRCUITO CENTRO'];
                geoData = {
                    lat: base.lat + (Math.random() - 0.5) * 0.05,
                    lng: base.lng + (Math.random() - 0.5) * 0.05
                };
            }

            if (geoData) {
                console.log(`✅ Coordenadas asignadas: ${geoData.lat}, ${geoData.lng}`);
                await client.query(
                    'UPDATE cliente SET latitud = $1, longitud = $2 WHERE rut = $3',
                    [geoData.lat, geoData.lng, sample.rut]
                );
            }
        }

        console.log('\n🏁 PoC Finalizada.');
    } catch (err) {
        console.error('❌ Error en PoC:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

runPoC();
