const fs = require('fs');
const path = require('path');

// FIX: Use __dirname directly since the script is IN backend/scripts
const scriptsDir = __dirname;
const archiveDir = path.join(scriptsDir, 'archive');

// 1. Define sets of files to KEEP
const keepPatterns = [
    'cleanup_scripts.js', // Keep myself!

    // NPM Scripts (from package.json)
    'import_full_base_fast.js',
    'import_abonos_fast.js',
    'merge_duplicate_users.js',
    'import_model_excel.js',

    // Open by User (Context)
    'create_master_table.js',
    'fix_alex.js',
    'test_api_endpoints.js',
    'verify_dashboard_data.js',
    'link_users_to_aliases.js',
    'inspect_master_products.js',
    'check_alex_sales.js',
    'inspect_duplicates.js',
    'generate_vendor_mapping.js',
    'verify_abonos.js',

    // Recent Verification (Safe to keep for reference)
    'verify_db_counts.js',
    'verify_client_import_metrics.js',
    'verify_excel_headers.js',

    // Core / Seeding
    'seed_minimal_data.js',

    // Config/Utils likely useful
    'generate_bcrypt_hash.js'
];

// 2. Define patterns to ARCHIVE
// We'll be aggressive but safe: move anything matching these prefixes UNLESS it's in keepPatterns
const archivePrefixes = [
    'analyze_', 'audit_', 'check_', 'debug_', 'diagnose_', 'explore_',
    'fix_', 'full_', 'generate_', 'import_', 'inspect_', 'investigate_',
    'kill_', 'limpiar_', 'list_', 'load_', 'manual_', 'migrate_',
    'reassign_', 'recalculate_', 'reimport_', 'repair_', 'reset_',
    'resolve_', 'run_', 'search_', 'simulate_', 'standardize_',
    'test_', 'update_', 'validate_', 'verifica_', 'verify_'
];

if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);

const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js') || f.endsWith('.sql') || f.endsWith('.sh') || f.endsWith('.csv'));

let movedCount = 0;

console.log(`🧹 Cleaning up scripts in: ${scriptsDir}`);

files.forEach(file => {
    // Skip if in keep list
    if (keepPatterns.includes(file)) {
        console.log(`   Detailed Keep: ${file}`);
        return;
    }

    // Check if matches archive prefix
    const shouldArchive = archivePrefixes.some(prefix => file.startsWith(prefix));

    if (shouldArchive) {
        const oldPath = path.join(scriptsDir, file);
        const newPath = path.join(archiveDir, file);
        try {
            fs.renameSync(oldPath, newPath);
            console.log(`   Archived: ${file}`);
            movedCount++;
        } catch (e) {
            console.error(`   Failed to move ${file}: ${e.message}`);
        }
    } else {
        console.log(`   Skipped (No pattern match): ${file}`);
    }
});

console.log(`\n✅ Moved ${movedCount} files to backend/scripts/archive`);
