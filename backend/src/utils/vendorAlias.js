const pool = require('../db');

// Normalize a vendor display name: remove accents, collapse spaces, uppercase
function normalizeVendorName(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// Soft normalization: also strips common words
function softNormalize(name) {
  return normalizeVendorName(name)
    .replace(/\b(SR\.?|SRA\.?|VENDEDOR|JEFE|DE|DEL|LA|EL)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cache in memory for aliases and official names
let cache = { ts: 0, map: new Map(), officials: new Map() };
const TTL_MS = 5 * 60 * 1000;

async function refreshCache() {
  if (cache.ts && (Date.now() - cache.ts) < TTL_MS) return cache;

  const aliasMap = new Map();
  const officialsMap = new Map();

  // Load official vendor names from usuario
  const userRes = await pool.query(`
    SELECT nombre_vendedor
    FROM usuario
    WHERE LOWER(rol_usuario) = 'vendedor' AND nombre_vendedor IS NOT NULL
  `);
  for (const r of userRes.rows) {
    const official = r.nombre_vendedor;
    const n = normalizeVendorName(official);
    officialsMap.set(n, official);
  }

  // Load aliases from usuario_alias (if exists)
  const exists = await pool.query(`
    SELECT EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'usuario_alias'
    ) AS exists
  `);
  if (exists.rows[0]?.exists) {
    const aliasRes = await pool.query('SELECT alias, nombre_vendedor_oficial FROM usuario_alias');
    for (const r of aliasRes.rows) {
      const aliasNorm = normalizeVendorName(r.alias);
      aliasMap.set(aliasNorm, r.nombre_vendedor_oficial);
      const soft = softNormalize(r.alias);
      aliasMap.set(soft, r.nombre_vendedor_oficial);
    }
  }

  cache = { ts: Date.now(), map: aliasMap, officials: officialsMap };
  return cache;
}

// Resolve a raw name to an official vendor display name
async function resolveVendorName(raw) {
  if (!raw) return null;
  const c = await refreshCache();
  const n = normalizeVendorName(raw);
  const soft = softNormalize(raw);
  // Direct alias
  if (c.map.has(n)) return c.map.get(n);
  if (c.map.has(soft)) return c.map.get(soft);
  // Official list
  if (c.officials && c.officials.has(n)) return c.officials.get(n);
  // Try partial contains match
  for (const [key, val] of c.officials.entries()) {
    if (n.includes(key)) return val;
  }
  return raw; // fallback to original
}

module.exports = {
  normalizeVendorName,
  softNormalize,
  resolveVendorName,
  refreshCache
};