const axios = require('axios');

async function testAPI() {
  try {
    // 1. Login como Alex (vendedor)
    console.log('1. Haciendo login como Alex...');
    const loginResponse = await axios.post('http://localhost:3001/api/users/login', {
      email: 'alex.mondaca@lubricar-insa.cl',
      password: 'vendedor123' // intenta password común; si falla, ajustaremos
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login exitoso, token obtenido:', token ? 'token presente' : 'sin token');

    // 2. Obtener clientes inactivos
    console.log('\n2. Obteniendo clientes inactivos...');
    const inactivosResponse = await axios.get('http://localhost:3001/api/clients/inactivos-mes-actual', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✓ Respuesta exitosa');
    console.log('Clientes inactivos encontrados:', inactivosResponse.data.length);
    console.log('\nPrimeros 3 clientes:');
    console.log(JSON.stringify(inactivosResponse.data.slice(0, 3), null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    if (error.response) {
      console.error('Headers:', error.response.headers);
      console.error('Data (raw):', error.response.data);
    }
  }
}

testAPI();
