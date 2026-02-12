const axios = require('axios');

/**
 * Servicio de Geocodificación usando Google Maps API
 */
class GeocodingService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY;
        this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    }

    /**
     * Geocodifica una dirección
     * @param {string} address - Dirección completa (Calle, Número, Comuna, Ciudad, País)
     * @returns {Promise<{lat: number, lng: number, formatted_address: string}|null>}
     */
    async geocodeAddress(address) {
        if (!this.apiKey) {
            console.error('❌ Google Maps API Key no configurada.');
            return null;
        }

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    address: address,
                    key: this.apiKey,
                    region: 'cl' // Priorizar resultados en Chile
                }
            });

            const data = response.data;

            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                const location = result.geometry.location;
                return {
                    lat: location.lat,
                    lng: location.lng,
                    formatted_address: result.formatted_address,
                    place_id: result.place_id
                };
            } else if (data.status === 'ZERO_RESULTS') {
                console.warn(`⚠️ No se encontraron resultados para: ${address}`);
                return null;
            } else {
                console.error(`❌ Error en Geocoding API: ${data.status} - ${data.error_message || ''}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Error de red al geocodificar:', error.message);
            return null;
        }
    }

    /**
     * Construye una dirección formateada a partir de partes
     */
    formatAddress(calle, numero, comuna, ciudad) {
        const parts = [
            `${calle || ''} ${numero || ''}`.trim(),
            comuna,
            ciudad,
            'Chile'
        ];
        return parts.filter(p => p).join(', ');
    }
}

module.exports = new GeocodingService();
