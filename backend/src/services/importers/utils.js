function norm(s) {
    return (s == null ? '' : String(s))
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseExcelDate(value) {
    if (!value) return null;

    // 1. Excel Serial Date (Number)
    if (typeof value === 'number') {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return !isNaN(date.getTime()) ? date : null;
    }

    // 2. String Date
    if (typeof value === 'string') {
        const trimmed = value.trim();

        // 2a. Priority: Slash format DD/MM/YYYY (Chilean/European)
        // STRICT ENFORCEMENT: We assume DD/MM/YYYY always. 
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);

                // Basic validation
                if (day > 31 || month > 12) {
                    // Fallback or error? For now, let JS Date try to handle or return Invalid
                    // But if day > 12 and month <= 12, previous loose logic might have swapped them.
                    // Here we lock it to DD/MM/YYYY.
                }

                // Handle 2-digit years if necessary? (Usually Excel exports 4 digits)
                const fullYear = year < 100 ? 2000 + year : year;

                const date = new Date(fullYear, month - 1, day);
                if (!isNaN(date.getTime())) return date;
            }
        }

        // 2b. Fallback to ISO or standard parser for dashes YYYY-MM-DD
        // This correctly handles standard SQL/ISO dates
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

function parseNumeric(value) {
    if (value == null || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

module.exports = { norm, parseExcelDate, parseNumeric };
