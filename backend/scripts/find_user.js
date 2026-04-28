const { Client } = require('pg');
require('dotenv').config();

async function findUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  
  const email = 'mario.labbe@lubricar-insa.cl';
  console.log(`Buscando usuario: ${email}`);
  
  const res = await client.query('SELECT id, rut, nombre_vendedor, email, rol_usuario FROM usuario WHERE LOWER(email) = LOWER($1)', [email]);
  
  if (res.rows.length > 0) {
    console.table(res.rows);
  } else {
    console.log('Usuario no encontrado.');
  }

  await client.end();
}

findUser().catch(console.error);
