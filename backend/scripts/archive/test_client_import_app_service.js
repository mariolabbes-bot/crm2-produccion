const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { processClientesFileAsync } = require('../src/services/importers/clientes');
const fs = require('fs');

async function runTest() {
    // Correct Path based on 'find' result
    const relativePath = '../../IMPORTACION FINAL 2026/CLIENTES 15-01-26.xlsx';
    const filePath = path.join(__dirname, relativePath);

    console.log(`🧪 Testing Client Import Service with file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found at path:", filePath);
        process.exit(1);
    }

    const mockJobId = `TEST-CLIENT-${Date.now()}`;

    try {
        const result = await processClientesFileAsync(mockJobId, filePath, 'CLIENTES 15-01-26.xlsx');
        console.log("✅ Import Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Import Failed:", error);
    }
}

runTest();
