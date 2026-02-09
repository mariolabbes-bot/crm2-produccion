const pool = require('../src/db');
(async () => {
  try {
    const res = await pool.query("UPDATE usuario SET alias = 'MAIKO' WHERE alias = 'AMIKO' RETURNING id, alias");
    console.log('Alias actualizado:');
    res.rows.forEach(u => console.log(u.id + ': ' + u.alias));
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
