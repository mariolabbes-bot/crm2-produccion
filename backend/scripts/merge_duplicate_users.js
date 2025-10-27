require('dotenv').config();
const { Pool } = require('pg');

// Usar misma URL de Neon que los importadores para evitar roles locales
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || NEON_URL, ssl: { rejectUnauthorized: false } });

async function detectTables(client) {
  const out = { salesTable: null, abonosTable: null };
  const t = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' AND table_name IN ('sales','ventas','abonos','abono')
  `);
  t.rows.forEach(r => {
    if (r.table_name === 'sales' || r.table_name === 'ventas') out.salesTable = r.table_name;
    if (r.table_name === 'abonos' || r.table_name === 'abono') out.abonosTable = r.table_name;
  });
  // Detect actividad/clientes
  const hasClients = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='clients') AS e");
  const hasActivities = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='activities') AS e");
  out.hasClients = hasClients.rows[0]?.e || false;
  out.hasActivities = hasActivities.rows[0]?.e || false;
  return out;
}

function keyFirstTwo(nombre) {
  if (!nombre) return '';
  const parts = String(nombre).trim().split(/\s+/);
  return (parts[0] || '').toLowerCase() + ' ' + (parts[1] || '').toLowerCase();
}

async function mergeDuplicates() {
  const client = await pool.connect();
  try {
    const { salesTable, abonosTable, hasClients, hasActivities } = await detectTables(client);

    const { rows: users } = await client.query("SELECT id, nombre, email, rol FROM users WHERE rol IN ('vendedor','manager') ORDER BY id ASC");

    // Agrupar por primera+segunda palabra (lower)
    const groups = new Map();
    for (const u of users) {
      if (u.rol !== 'vendedor') continue; // solo vendedores
      const k = keyFirstTwo(u.nombre);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(u);
    }

    // Canonical preferidos (por nombre exacto) si existen
    const preferredEnv = (process.env.PREFERRED_CANONICALS || 'OMAR MALDONADO,NELSON MUÑOZ,ALEX MONDACA')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const preferredNames = new Set(preferredEnv.map(s => s.toLowerCase()));

    const actions = [];
    for (const [k, list] of groups.entries()) {
      if (list.length <= 1) continue;
      // elegir canónico: por preferido, si no, por menor id
      let canonical = list.find(u => preferredNames.has(String(u.nombre).toLowerCase()));
      if (!canonical) canonical = list.reduce((a,b) => a.id < b.id ? a : b);
      const dups = list.filter(u => u.id !== canonical.id);
      if (dups.length === 0) continue;
      actions.push({ key: k, canonical, dups });
    }

    if (actions.length === 0) {
      console.log('No se detectaron duplicados por primeras dos palabras.');
      return;
    }

    const preview = actions.map(a => ({
      clave: a.key,
      canonical: { id: a.canonical.id, nombre: a.canonical.nombre },
      dups: a.dups.map(d => ({ id: d.id, nombre: d.nombre }))
    }));
    console.log('Duplicados detectados (preview):');
    console.log(JSON.stringify(preview, null, 2));

    const DRY_RUN = (process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
    if (DRY_RUN) {
      console.log('DRY_RUN=TRUE -> No se aplicarán cambios. Ejecute con DRY_RUN=false para consolidar.');
      return;
    }

    await client.query('BEGIN');
    for (const a of actions) {
      const cId = a.canonical.id;
      for (const d of a.dups) {
        const dId = d.id;
        if (salesTable) await client.query(`UPDATE ${salesTable} SET vendedor_id = $1 WHERE vendedor_id = $2`, [cId, dId]);
        if (abonosTable) await client.query(`UPDATE ${abonosTable} SET vendedor_id = $1 WHERE vendedor_id = $2`, [cId, dId]);
        if (hasClients) await client.query(`UPDATE clients SET vendedor_id = $1 WHERE vendedor_id = $2`, [cId, dId]);
        if (hasActivities) await client.query(`UPDATE activities SET usuario_id = $1 WHERE usuario_id = $2`, [cId, dId]);
        await client.query('DELETE FROM users WHERE id = $1', [dId]);
        console.log(`Fusionado usuario ${dId} -> ${cId}`);
      }
    }
    await client.query('COMMIT');
    console.log('✅ Consolidación completada');
  } catch (e) {
    console.error('Error en consolidación:', e);
    try { await pool.query('ROLLBACK'); } catch(_) {}
    process.exit(1);
  } finally {
    await pool.end();
  }
}

mergeDuplicates();
