const axios = require('axios');

async function testAPI() {
  try {
    // 1. Login como manager
    console.log('1. Haciendo login...');
    const loginResponse = await axios.post('http://localhost:3001/api/users/login', {
      email: 'mario.labbe@lubricar-insa.cl',
      password: 'manager123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login exitoso, token obtenido');

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
  }
}

testAPI();
