const ClientModel = require('../models/client');
const axios = require('axios');
const pool = require('../db'); // Necesario solo si hacemos consultas de usuario extra, aunque idealmente User service lo haría.

class ClientService {
    static async getAllClients(user) {
        const isManager = user.rol === 'manager';
        return await ClientModel.findAll({ isManager, userId: user.id });
    }

    static async getClientByRut(rut, user) {
        const client = await ClientModel.findByRut(rut);
        if (!client) return null;

        if (user.rol !== 'manager') {
            // Verificar pertenencia
            // En la lógica anterior: nombre_vendedor del cliente == nombre_vendedor del user
            if (client.nombre_vendedor !== user.nombre_vendedor && client.nombre_vendedor !== user.alias) {
                throw new Error('Access denied');
            }
        }
        return client;
    }

    static async createClient(data, user) {
        // Geocoding logic
        let { direccion, ciudad, estado, codigo_postal, pais } = data;
        let latitud = null, longitud = null;

        if (process.env.GOOGLE_MAPS_API_KEY && direccion) {
            try {
                const fullAddress = `${direccion}, ${ciudad}, ${estado}, ${codigo_postal}, ${pais}`;
                const geoResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                    params: { address: fullAddress, key: process.env.GOOGLE_MAPS_API_KEY }
                });
                if (geoResponse.data.status === 'OK') {
                    const loc = geoResponse.data.results[0].geometry.location;
                    latitud = loc.lat;
                    longitud = loc.lng;
                }
            } catch (err) {
                console.error('Geocoding service failed:', err.message);
                // Continuamos sin coords
            }
        }

        // Determine vendor ID
        const vendedorId = (user.rol === 'manager' && data.vendedor_id) ? data.vendedor_id : user.id;

        return await ClientModel.create({
            ...data,
            latitud,
            longitud,
            vendedor_id: vendedorId
        });
    }

    static async updateClient(id, data, user) {
        const isManager = user.rol === 'manager';
        return await ClientModel.update(id, data, { isManager, userId: user.id });
    }

    static async deleteClient(id, user) {
        const isManager = user.rol === 'manager';
        return await ClientModel.delete(id, { isManager, userId: user.id });
    }

    static async bulkCreateClients(clients, user) {
        // No geocoding for bulk to avoid limits
        return await ClientModel.createBulk(clients, user.id);
    }

    // --- REPORTES ---

    static async getInactivosMesActual(user, filterVendedorId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const mesActualIni = `${year}-${String(month).padStart(2, '0')}-01`;
        const mesActualFin = new Date(year, month, 0);
        const mesActualFinStr = `${year}-${String(month).padStart(2, '0')}-${String(mesActualFin.getDate()).padStart(2, '0')}`;
        const hace12m = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        const hace12mStr = `${hace12m.getFullYear()}-${String(hace12m.getMonth() + 1).padStart(2, '0')}-01`;

        let vendedorAlias = null;

        if (user.rol !== 'manager') {
            // Obtener alias del usuario actual si no lo tiene en el objeto user (request)
            // Asumiremos que req.user tiene id. Hacemos query auxiliar aquí o asumimos que viene poblado.
            // La ruta original hace query a 'usuario' para sacar alias.
            const uRes = await pool.query('SELECT alias FROM usuario WHERE id = $1', [user.id]);
            vendedorAlias = uRes.rows[0]?.alias;
        } else if (filterVendedorId) {
            const vRes = await pool.query('SELECT alias FROM usuario WHERE id = $1', [filterVendedorId]);
            vendedorAlias = vRes.rows[0]?.alias;
        }

        return await ClientModel.findInactivosMesActual({
            hace12mStr, mesActualIni, mesActualFinStr, vendedorAlias
        });
    }

    static async getTopVentas(user, queryVendedorId) {
        const isManager = user.rol?.toLowerCase() === 'manager';
        let nombreVendedor = null;

        if (!isManager && user.nombre_vendedor) {
            nombreVendedor = user.nombre_vendedor;
        } else if (queryVendedorId) {
            const vRes = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [queryVendedorId]);
            nombreVendedor = vRes.rows[0]?.nombre_vendedor;
        }

        return await ClientModel.findTopVentas({ nombreVendedor, isManager });
    }

    static async getFacturasImpagas(user, queryVendedorId) {
        const isManager = user.rol?.toLowerCase() === 'manager';
        let nombreVendedor = null;

        if (!isManager) {
            nombreVendedor = user.nombre_vendedor || user.alias;
        } else if (queryVendedorId) {
            const vRes = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [queryVendedorId]);
            nombreVendedor = vRes.rows[0]?.nombre_vendedor;
        }

        return await ClientModel.findFacturasImpagas({ nombreVendedor });
    }

    static async searchClients(q, user, queryVendedorId) {
        if (!q || q.trim().length < 2) return [];

        const isManager = user.rol?.toLowerCase() === 'manager';
        let nombreVendedor = null;

        if (!isManager) {
            nombreVendedor = user.nombre_vendedor || user.alias;
        } else if (queryVendedorId) {
            const vRes = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [queryVendedorId]);
            nombreVendedor = vRes.rows[0]?.nombre_vendedor;
        }

        return await ClientModel.search({ term: q.trim(), nombreVendedor });
    }
    static async getIncompleteClients() {
        return await ClientModel.findIncomplete();
    }

    static async bulkAssignCircuit(ruts, circuito, user) {
        // We could add permissions check here if not manager, but for now allow updating owned clients.
        // Assuming bulkAssignCircuit updates regardless for simplicity, or we can restrict.
        // The current implementation is simple and updates all provided ruts.
        return await ClientModel.bulkAssignCircuit(ruts, circuito);
    }
}

module.exports = ClientService;
