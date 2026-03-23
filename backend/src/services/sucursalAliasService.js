const pool = require('../db');

let aliasCache = new Map();

/**
 * Loads the sucursal_alias table into memory for fast lookups.
 */
async function refreshSucursalAliasCache() {
    try {
        const { rows } = await pool.query('SELECT valor_excel, sucursal_real FROM sucursal_alias');
        const newCache = new Map();
        for (const row of rows) {
            newCache.set(row.valor_excel.trim().toUpperCase(), row.sucursal_real.trim().toUpperCase());
        }
        aliasCache = newCache;
        console.log(`✅ [SucursalAlias] Cache refreshed: ${aliasCache.size} keys loaded.`);
    } catch (error) {
        console.error('❌ [SucursalAlias] Error loading cache:', error);
    }
}

/**
 * Resolves an Excel branch name to its official name.
 * If not found, returns the normalized form of the input.
 * @param {string} rawVal 
 * @returns {string} The standardized branch name
 */
function resolveBranch(rawVal) {
    if (!rawVal) return 'GENERICA';
    const normalized = String(rawVal).trim().toUpperCase();
    if (aliasCache.has(normalized)) {
        return aliasCache.get(normalized);
    }
    return normalized;
}

/**
 * Checks if a string is a known branch alias or official branch.
 */
function isKnownBranchOrAlias(rawVal) {
    if (!rawVal) return false;
    const normalized = String(rawVal).trim().toUpperCase();
    if (aliasCache.has(normalized)) return true;
    for (const realVal of aliasCache.values()) {
        if (realVal === normalized) return true;
    }
    return false;
}

module.exports = {
    refreshSucursalAliasCache,
    resolveBranch,
    isKnownBranchOrAlias
};
