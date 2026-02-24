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
    SELECT nombre_vendedor, alias
    FROM usuario
    WHERE LOWER(rol_usuario) = 'vendedor' AND nombre_vendedor IS NOT NULL
  `);
  for (const r of userRes.rows) {
    const officialName = r.nombre_vendedor;
    // CRITICAL: The 'venta' table FK references 'alias'. So we must resolve to the Alias.
    // If alias is null, we fallback to name (hoping it matches hidden alias or just trying)
    const targetValue = r.alias || officialName;

    const n = normalizeVendorName(officialName);
    officialsMap.set(n, targetValue);

    // Also map the alias itself if it differs
    if (r.alias) {
      officialsMap.set(normalizeVendorName(r.alias), targetValue);
    }
  }
  console.log(`✅ [VendorAlias] Cache refreshed: ${officialsMap.size} keys loaded (Value=Alias).`);
  if (officialsMap.has('LUIS')) console.log(`   👉 Found 'LUIS' in cache -> '${officialsMap.get('LUIS')}'`);
  else console.log(`   ❌ 'LUIS' NOT found in cache! Keys example: ${Array.from(officialsMap.keys()).slice(0, 5)}`);

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

  let result = null;

  // 1. Hardcoded Patches (System Errors)
  if (n === 'ALEJANDRA') result = 'LUIS';
  else if (n === 'OCTAVIO') result = 'JOAQUIN';
  else if (n === 'MATIAS IGNACIO') result = 'EDUARDO ROJAS';
  else if (n === 'ALEJANDRO MAURICIO') result = 'MATIAS FELIPE';

  // 2. Direct alias lookup
  if (!result) {
    if (c.map.has(n)) result = c.map.get(n);
    else if (c.map.has(soft)) result = c.map.get(soft);
  }

  // 3. If we found a match (Hardcoded or Alias), try to get Canonical Case from Officials
  //    This handles "LUIS" -> "Luis" conversion to satisfy FKs
  if (result) {
    const rNorm = normalizeVendorName(result);
    if (c.officials.has(rNorm)) return c.officials.get(rNorm);
    // If we mapped to "LUIS" but "LUIS" isn't in official list... 
    // We might have a problem (FK error), but we return what we found.
    return result;
  }

  // 4. Official list (Input might be the official name itself)
  if (c.officials && c.officials.has(n)) return c.officials.get(n);

  // 5. Try partial contains match
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