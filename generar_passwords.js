const bcrypt = require('bcryptjs');

async function generarHashes() {
  const salt = await bcrypt.genSalt(10);
  
  const hashVendedor = await bcrypt.hash('vendedor123', salt);
  const hashManager = await bcrypt.hash('manager123', salt);
  
  console.log('='.repeat(60));
  console.log('HASHES GENERADOS PARA CONTRASEÑAS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Contraseña para VENDEDORES: vendedor123');
  console.log('Hash:');
  console.log(hashVendedor);
  console.log('');
  console.log('Contraseña para MANAGERS: manager123');
  console.log('Hash:');
  console.log(hashManager);
  console.log('');
  console.log('='.repeat(60));
}

generarHashes();
