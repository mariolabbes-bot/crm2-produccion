const axios = require('axios');

const BASE_URL = 'https://crm2-backend.onrender.com/api';

async function testEndpoint() {
  try {
    console.log('🔐 Obteniendo token de autenticación...\n');
    
    // Login como manager
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'manager@crm.com',
      password: 'manager123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtenido\n');
    
    // Consultar el endpoint comparativo para 2025
    console.log('📊 Consultando ventas por vendedor por mes en 2025...\n');
    const response = await axios.get(
      `${BASE_URL}/abonos/comparativo?agrupar=mes&fecha_desde=2025-01-01&fecha_hasta=2025-12-31`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const data = response.data.data;
    
    if (!data.detalle || data.detalle.length === 0) {
      console.log('❌ No hay datos de ventas para 2025\n');
      console.log('Resumen:', data.resumen);
    } else {
      console.log(`✅ ${data.detalle.length} registros encontrados\n`);
      console.log('📋 Primeros 20 registros:');
      console.table(data.detalle.slice(0, 20));
      
      console.log('\n📊 Resumen general:');
      console.log(data.resumen);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEndpoint();
