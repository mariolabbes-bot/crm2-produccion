require('dotenv').config();
const pool = require('../src/db');

async function ensureUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const manager = await client.query("SELECT id FROM users WHERE rol='manager' LIMIT 1");
    if (manager.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('manager123', salt);
      await client.query(
        "INSERT INTO users (nombre, email, password, rol) VALUES ($1,$2,$3,$4)",
        ['Manager', 'manager@crm.com', hashed, 'manager']
      );
      console.log('✅ Usuario manager creado');
    }
    const vend = await client.query("SELECT COUNT(*) FROM users WHERE rol='vendedor'");
    if (parseInt(vend.rows[0].count) === 0) {
      const sellers = ['OMAR MALDONADO','NELSON MUÑOZ','ALEX MONDACA'];
      for (const s of sellers) {
        await client.query("INSERT INTO users (nombre, email, password, rol) VALUES ($1,$2,$3,$4)", [s, `${s.split(' ')[0].toLowerCase()}@crm.com`, '$2a$10$placeholderhashaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbb', 'vendedor']);
      }
      console.log('✅ Vendedores de ejemplo creados');
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function ensureAbonos() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT 
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='abonos') AS has_abonos,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='abono') AS has_abono
    `);
    const r = rows[0] || {}; const abonosTable = r.has_abonos ? 'abonos' : (r.has_abono ? 'abono' : null);
    if (!abonosTable) throw new Error('No existe tabla de abonos');
    const count = await client.query(`SELECT COUNT(*) FROM ${abonosTable}`);
    if (parseInt(count.rows[0].count) === 0) {
      const users = await client.query("SELECT id FROM users WHERE rol IN ('vendedor','manager') ORDER BY id LIMIT 3");
      const uids = users.rows.map(r=>r.id);
      if (uids.length === 0) throw new Error('No users to assign abonos');
      const today = new Date();
      const y = today.getFullYear();
      const inserts = [];
      for (let m = 1; m <= 3; m++) {
        for (const uid of uids) {
          inserts.push(client.query(
            `INSERT INTO ${abonosTable}(vendedor_id, fecha_abono, monto, descripcion, folio, cliente_nombre, tipo_pago) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [uid, `${y}-0${m}-15`, 100000 + uid * 1000 + m * 100, 'seed', `FOL-${uid}-${m}`, `Cliente ${uid}`, 'Transferencia']
          ));
        }
      }
      await Promise.all(inserts);
      console.log('✅ Abonos de ejemplo insertados');
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await ensureUsers();
    await ensureAbonos();
    console.log('✅ Seed minimal completado');
  } catch (e) {
    console.error('❌ Seed error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
