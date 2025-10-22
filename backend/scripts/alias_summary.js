const XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

function norm(s) {
  return (s == null ? '' : String(s))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheetName = wb.SheetNames.includes('VENTAS 2024-2025') ? 'VENTAS 2024-2025' : wb.SheetNames[0];
  const sh = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sh, { raw: true });
  const headers = Object.keys(rows[0] || {});
  const colVendedorDoc = headers.find(h => /Vendedor\s*cliente|Vendedor\s*documento|Vendedor/i.test(h));
  if (!colVendedorDoc) {
    console.error('No se encontró columna de vendedor');
    process.exit(1);
  }
  const counts = new Map();
  for (const r of rows) {
    const alias = norm(r[colVendedorDoc] || '');
    if (!alias) continue;
    counts.set(alias, (counts.get(alias) || 0) + 1);
  }
  const outPath = __dirname + '/alias_summary.csv';
  const arr = [...counts.entries()].sort((a,b)=>b[1]-a[1]);
  const csv = ['alias,count', ...arr.map(([a,c])=>`${a},${c}`)].join('\n');
  fs.writeFileSync(outPath, csv);
  console.log(`Resumen generado: ${outPath}`);
  console.log('Top 20:\n', arr.slice(0,20));
}

main();
