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
    if (typeof value === 'number' && !isNaN(value)) {
        const utc_days = Math.floor(value - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
        const v = value.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
            const d = new Date(v);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
        }
        const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (m) {
            const dd = String(m[1]).padStart(2, '0');
            const mm = String(m[2]).padStart(2, '0');
            const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
            const d = new Date(`${yyyy}-${mm}-${dd}`);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
        }
        const d = new Date(v);
        if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    return null;
}

function parseNumeric(value) {
    if (value == null || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

module.exports = { norm, parseExcelDate, parseNumeric };
