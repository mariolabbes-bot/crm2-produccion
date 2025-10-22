const XLSX = require('xlsx');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const MAPPING_FILE = '/Users/mariolabbe/Desktop/base vendedores.xlsx';

function norm(s){
  return (s==null?'':String(s)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}

function fullName(row){
  const parts = [row[' NOMBRE '], row[' APELLIDO '], row[' APELLIDO 2 ']]
    .map(x=>x==null?'':String(x).trim())
    .filter(Boolean);
  return parts.join(' ').trim();
}

async function main(){
  const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized:false } });
  const wb = XLSX.readFile(MAPPING_FILE);
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sh, { raw: true });

  // cargar existentes
  const existing = await pool.query("SELECT id, nombre, email FROM users");
  const byNorm = new Map(existing.rows.map(u => [norm(u.nombre), u.id]));
  const emails = new Set(existing.rows.map(u => (u.email||'').toLowerCase()));

  // precompute default password hash
  const defaultPassword = 'Vendedor123*';
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(defaultPassword, salt);

  function makeEmailFromName(name){
    const tokens = name.split(' ').filter(Boolean);
    let base = tokens.length >= 2 ? `${tokens[0]}.${tokens[tokens.length-1]}` : tokens[0] || 'vendedor';
    base = base.toLowerCase().replace(/[^a-z0-9.]/g,'');
    let email = `${base}@crm.com`;
    let n=1;
    while (emails.has(email)) {
      email = `${base}${n}@crm.com`;
      n++;
    }
    emails.add(email);
    return email.toUpperCase() === email ? email.toLowerCase() : email; // ensure lower
  }

  let created = 0, skipped = 0;
  for(const r of rows){
    const name = fullName(r);
    if(!name) continue;
    const key = norm(name);
    if(byNorm.has(key)) { skipped++; continue; }
    try{
      const email = makeEmailFromName(name);
      const res = await pool.query("INSERT INTO users (nombre, email, password, rol) VALUES ($1, $2, $3, 'vendedor') RETURNING id", [name, email, hashed]);
      byNorm.set(key, res.rows[0].id);
      created++;
    }catch(e){
      console.error('Insert failed for', name, e.message);
    }
  }

  console.log(`Usuarios creados: ${created}, ya existentes: ${skipped}`);
  await pool.end();
}

main().catch(e=>{console.error(e);process.exit(1);});
