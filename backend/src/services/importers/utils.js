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
        // This fixes the bug where 11/02/2026 was parsed as Nov 2nd instead of Feb 11th
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            if (parts.length === 3) {
                const p1 = parseInt(parts[0], 10); // Day
                const p2 = parseInt(parts[1], 10); // Month
                const p3 = parseInt(parts[2], 10); // Year

                // Assumption: If first part > 12, it represents Day. 
                // BUT even if <= 12, we enforce DD/MM/YYYY as per user requirement.
                // We handle the edge case where Year might be first (YYYY/MM/DD), typically rare with slashes but possible.

                // Case: DD/MM/YYYY (Standard)
                if (p3 > 1900) {
                    const date = new Date(p3, p2 - 1, p1);
                    if (!isNaN(date.getTime())) return date;
                }
                // Case: YYYY/MM/DD (Less common with slashes)
                else if (p1 > 1900) {
                    const date = new Date(p1, p2 - 1, p3);
                    if (!isNaN(date.getTime())) return date;
                }
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
