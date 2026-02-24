require('dotenv').config();
const { resolveVendorName } = require('../src/utils/vendorAlias');

async function test() {
    console.log('🧪 Testing Vendor Mappings (Case Sensitivity)...');

    // Note: This test relies on DB connection to load cache!
    // We assume the DB has 'Luis' as official name.

    const cases = [
        { input: 'Alejandra', expected: 'Luis' }, // Canonical case!
        { input: 'OCTAVIO', expected: 'Joaquin' },
        { input: 'Alejandro Mauricio', expected: 'Matias Felipe' }
    ];

    for (const c of cases) {
        const result = await resolveVendorName(c.input);

        // We might need to be flexible if DB isn't perfectly populated in this dev environment
        // but let's see what it returns.
        console.log(`Input: "${c.input}" -> Output: "${result}"`);

        if (result === c.expected) console.log('✅ Match');
        else if (result && result.toUpperCase() === c.expected.toUpperCase()) console.log('⚠️ Case Mismatch (Check DB exact val)');
        else console.log('❌ Fail');
    }

    process.exit(0);
}

test();
