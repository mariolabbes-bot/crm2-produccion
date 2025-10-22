const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function main(){
  const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized:false } });
  const names = ['MARCELO', 'OCTAVIO', 'ALEJANDRO'];

  const existing = await pool.query('SELECT id, nombre FROM users WHERE UPPER(nombre) = ANY($1)', [names]);
  const have = new Set(existing.rows.map(r=>r.nombre.toUpperCase()));

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash('Vendedor123*', salt);

  let created = 0;
  for (const name of names) {
    if (have.has(name)) continue;
    const emailBase = name.toLowerCase().replace(/[^a-z0-9]/g,'');
    const email = `${emailBase}@crm.com`;
    await pool.query("INSERT INTO users (nombre, email, password, rol) VALUES ($1,$2,$3,'vendedor')", [name, email, hashed]);
    created++;
  }
  console.log(`Usuarios creados: ${created}`);
  await pool.end();
}

main().catch(e=>{console.error(e);process.exit(1);});
