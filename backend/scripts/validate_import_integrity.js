require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// --- CONFIG ---
// Use a separate pool for this script if run standalone, 
// but we might want to accept a client if integrated. 
// For simplicity in this iteration, we create a new pool/client each time to ensure isolation.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

// --- UTILS ---
const parseNumeric = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    return parseFloat(str) || 0;
};

const excelDateToJSDate = (serial) => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate() + 1);
};

const parseDate = (val) => {
    if (val instanceof Date) return val;
    if (typeof val === 'number') return excelDateToJSDate(val);
    if (typeof val === 'string') return new Date(val);
    return null;
};

// --- MAIN LOGIC ---
async function validateIntegrity(filePath, type) {
    const client = await pool.connect();

    try {
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) return { success: false, error: "Excel is empty" };

        let excelTotal = 0;
        let excelCount = 0;
        let minDate = new Date('2099-01-01');
        let maxDate = new Date('1900-01-01');

        // Detect Columns
        const firstRow = rawData[0];
        const keys = Object.keys(firstRow);
        const colDate = keys.find(k => /fecha/i.test(k));
        const colTotal = keys.find(k => /total|monto|valor/i.test(k));

        if (!colDate || !colTotal) {
            return { success: false, error: "Could not detect Date or Total columns in Excel" };
        }

        rawData.forEach(row => {
            const date = parseDate(row[colDate]);
            const amount = parseNumeric(row[colTotal]);

            if (date && !isNaN(date.getTime())) {
                if (date < minDate) minDate = date;
                if (date > maxDate) maxDate = date;
            }
            excelTotal += amount;
            excelCount++;
        });

        const formatDate = (d) => d.toISOString().split('T')[0];
        const minDateStr = formatDate(minDate);
        const maxDateStr = formatDate(maxDate);

        let query = '';
        if (type === 'ventas') {
            query = `SELECT SUM(valor_total) as total, COUNT(*) as count FROM venta WHERE fecha_emision >= $1 AND fecha_emision <= $2`;
        } else if (type === 'abonos') {
            query = `SELECT SUM(monto) as total, COUNT(*) as count FROM abono WHERE fecha >= $1 AND fecha <= $2`;
        } else {
            return { success: false, error: "Invalid Type" };
        }

        const dbRes = await client.query(query, [minDateStr, maxDateStr]);
        const dbTotal = parseFloat(dbRes.rows[0].total || 0);
        const dbCount = parseInt(dbRes.rows[0].count || 0);

        const diffTotal = dbTotal - excelTotal;

        return {
            success: true,
            dateRange: `${minDateStr} to ${maxDateStr}`,
            excelTotal,
            dbTotal,
            diffTotal,
            excelCount,
            dbCount,
            integrity: Math.abs(diffTotal) < 100 // Tolerance
        };

    } catch (error) {
        console.error('Validation Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

// CLI Execution
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node validate_import_integrity.js <path> <type>");
    } else {
        validateIntegrity(args[0], args[1]).then(console.log).then(() => pool.end());
    }
}

module.exports = { validateIntegrity };
