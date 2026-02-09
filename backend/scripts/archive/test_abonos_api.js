const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAbonosAPI() {
  try {
    console.log('🧪 Probando API de Abonos\n');
    console.log('==========================\n');

    // 1. Login
    console.log('1. Obteniendo token...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'manager@crm.com',
      password: 'manager123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtenido\n');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 2. Obtener lista de abonos
    console.log('2. Obteniendo lista de abonos (5 primeros)...');
    const abonosResponse = await axios.get(`${BASE_URL}/abonos?limit=5`, { headers });
    console.log(`✅ ${abonosResponse.data.data.length} abonos obtenidos`);
    console.log(`   Total en BD: ${abonosResponse.data.pagination.total}`);
    console.log('   Primer abono:', abonosResponse.data.data[0]);
    console.log('');

    // 3. Obtener tipos de pago
    console.log('3. Obteniendo tipos de pago...');
    const tiposResponse = await axios.get(`${BASE_URL}/abonos/tipos-pago`, { headers });
    console.log('✅ Tipos de pago:', tiposResponse.data.data);
    console.log('');

    // 4. Obtener estadísticas
    console.log('4. Obteniendo estadísticas...');
    const statsResponse = await axios.get(`${BASE_URL}/abonos/estadisticas`, { headers });
    console.log('✅ Estadísticas:');
    console.log('   Total abonos:', statsResponse.data.data.resumen.total_abonos);
    console.log('   Monto total: $', parseFloat(statsResponse.data.data.resumen.monto_total).toLocaleString());
    console.log('   Promedio: $', parseFloat(statsResponse.data.data.resumen.promedio_abono).toLocaleString());
    console.log('');
    console.log('   Por tipo de pago (top 3):');
    statsResponse.data.data.por_tipo_pago.slice(0, 3).forEach(tp => {
      console.log(`   - ${tp.tipo_pago}: ${tp.cantidad} abonos ($${parseFloat(tp.monto_total).toLocaleString()})`);
    });
    console.log('');

    // 5. Obtener resumen por vendedor
    console.log('5. Obteniendo resumen por vendedor (top 5)...');
    const vendedoresResponse = await axios.get(`${BASE_URL}/abonos/por-vendedor`, { headers });
    console.log('✅ Top 5 vendedores por abonos:');
    vendedoresResponse.data.data.slice(0, 5).forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.vendedor_nombre}`);
      console.log(`      Abonos: ${v.cantidad_abonos} ($${parseFloat(v.total_abonos || 0).toLocaleString()})`);
      console.log(`      Ventas: ${v.cantidad_ventas} ($${parseFloat(v.total_ventas || 0).toLocaleString()})`);
      console.log(`      % Cobrado: ${v.porcentaje_cobrado}%`);
    });
    console.log('');

    // 6. Obtener comparativo
    console.log('6. Obteniendo comparativo ventas vs abonos (últimos 3 meses)...');
    const comparativoResponse = await axios.get(
      `${BASE_URL}/abonos/comparativo?agrupar=mes&fecha_desde=2025-07-01`, 
      { headers }
    );
    console.log('✅ Comparativo (resumen):');
    const resumen = comparativoResponse.data.data.resumen;
    console.log(`   Total ventas: $${parseFloat(resumen.total_ventas || 0).toLocaleString()}`);
    console.log(`   Total abonos: $${parseFloat(resumen.total_abonos || 0).toLocaleString()}`);
    console.log(`   Saldo pendiente: $${parseFloat(resumen.saldo_pendiente || 0).toLocaleString()}`);
    console.log(`   % Cobrado: ${resumen.porcentaje_cobrado_total}%`);
    console.log('');

    console.log('✅ Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAbonosAPI();
