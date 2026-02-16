const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
// Se requiere un token válido de un usuario con features.ai_module.enabled = true
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN es requerido. Ejecutar: AUTH_TOKEN=ey... node verify_deployment.js');
    process.exit(1);
}

const runTests = async () => {
    console.log('🚀 Iniciando Verificación de Despliegue CRM2...');

    // 1. Health Check
    try {
        const res = await axios.get(`${API_URL}/health`);
        console.log('✅ Health Check:', res.data.status);
    } catch (err) {
        console.error('❌ Health Check Failed:', err.message);
    }

    // 2. Mobile Dashboard Summary
    try {
        const res = await axios.get(`${API_URL}/mobile/dashboard/summary`, {
            headers: { 'Authorization': AUTH_TOKEN }
        });
        console.log('✅ Mobile Dashboard:', res.data);
    } catch (err) {
        console.error('❌ Mobile Dashboard Failed:', err.response?.status, err.response?.data?.msg || err.message);
    }

    // 3. AI Chat (Smoke Test)
    try {
        const res = await axios.post(`${API_URL}/ai/chat`, {
            message: 'Hola, ¿estás operativo?'
        }, {
            headers: { 'Authorization': AUTH_TOKEN }
        });
        console.log('✅ AI Chat Response:', res.data.content ? 'OK' : 'Empty');
    } catch (err) {
        if (err.response?.status === 403) {
            console.log('⚠️ AI Chat: Acceso Denegado (Expected si el usuario no tiene feature flag activado)');
        } else {
            console.error('❌ AI Chat Failed:', err.response?.status, err.response?.data || err.message);
        }
    }

    console.log('🏁 Verificación completada.');
};

runTests();
