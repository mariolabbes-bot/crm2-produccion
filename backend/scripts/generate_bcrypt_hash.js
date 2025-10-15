// Script para generar un hash bcrypt de una contraseña
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Debes ingresar una contraseña como argumento.');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('Hash bcrypt generado:');
  console.log(hash);
  process.exit(0);
});
