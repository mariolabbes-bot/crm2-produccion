const fs = require('fs');
const path = require('path');

const dataRaw = fs.readFileSync(path.join(__dirname, '../outputs/audit_results.json'), 'utf8');
const data = JSON.parse(dataRaw);

const users = data.users;
const aliases = data.aliases;
const ventas = data.ventas_3_meses;
const abonos = data.abonos_3_meses;

let report = `# Auditoría de Mapeo de Vendedores y Abonos\n\n`;
report += `## 1. Resumen de Usuarios Oficiales (Roster)\n\n`;
report += `Total de vendedores/managers activos: ${users.length}\n\n`;
report += `| RUT | Nombre Oficial | Alias Oficial en DB | Rol |\n`;
report += `|---|---|---|---|\n`;
users.forEach(u => {
    report += `| ${u.rut} | ${u.nombre_vendedor || ''} | ${u.alias || ''} | ${u.rol_usuario} |\n`;
});

report += `\n## 2. Ventas Registradas (Últimos 3 meses)\n\n`;
report += `Vendors listados en la tabla de Ventas que no hacen match exacto o sí lo hacen:\n\n`;
report += `| Nombre en Venta (Excel/DB) | Transacciones | Monto Total |\n`;
report += `|---|---|---|\n`;
ventas.forEach(v => {
    report += `| ${v.vendedor_str_en_db} | ${v.total_transacciones} | $${Number(v.monto_total_ventas).toLocaleString('es-CL')} |\n`;
});

report += `\n## 3. Abonos Registrados (Últimos 3 meses)\n\n`;
report += `Vendors listados en la tabla de Abonos:\n\n`;
report += `| Nombre en Abono (Excel/DB) | Transacciones | Monto Total |\n`;
report += `|---|---|---|\n`;
abonos.forEach(a => {
    report += `| ${a.vendedor_str_en_db} | ${a.total_transacciones} | $${Number(a.monto_total_abonos).toLocaleString('es-CL')} |\n`;
});

// Calculate discrepancies
const officialNames = new Set(users.map(u => (u.nombre_vendedor || '').toUpperCase().trim()));
const officialAliases = new Set(users.map(u => (u.alias || '').toUpperCase().trim()));
const validIdentifiers = new Set([...officialNames, ...officialAliases]);

report += `\n## 4. Anomalías Detectadas (Orfandad)\n\n`;
report += `A continuación se listan nombres en Ventas o Abonos que **NO existen** ni como "nombre_vendedor" ni como "alias" en la tabla \`usuario\`:\n\n`;

const anonVentas = ventas.filter(v => !validIdentifiers.has(v.vendedor_str_en_db.toUpperCase().trim()));
if (anonVentas.length > 0) {
    report += `### En Ventas:\n`;
    anonVentas.forEach(v => {
        report += `- **${v.vendedor_str_en_db}**: $${Number(v.monto_total_ventas).toLocaleString('es-CL')} (${v.total_transacciones} trx)\n`;
    });
} else {
    report += `*No hay ventas huérfanas.* Todo cruza perfecto.\n`;
}

const anonAbonos = abonos.filter(a => !validIdentifiers.has(a.vendedor_str_en_db.toUpperCase().trim()));
if (anonAbonos.length > 0) {
    report += `\n### En Abonos:\n`;
    anonAbonos.forEach(a => {
        report += `- **${a.vendedor_str_en_db}**: $${Number(a.monto_total_abonos).toLocaleString('es-CL')} (${a.total_transacciones} trx)\n`;
    });
} else {
    report += `\n*No hay abonos huérfanos.* Todo cruza perfecto.\n`;
}

report += `\n## 5. Propuesta de Refactorización (Plan de Trabajo)\n\n`;
report += `1. **Limpieza de la tabla \`usuario\`**: Estandarizar el campo \`alias\` para todos los vendedores.\n`;
report += `2. **Estandarización de Cruce**: Modificar el cruce del Dashboard para que siempre junte por \`alias\` ignorando mayúsculas y acentos.\n`;
report += `3. **Unificación de importadores**: El importador de Abonos y Ventas deberían usar estrictamente la misma función \`resolveVendorName\` (ya corregida hoy).\n`;
report += `4. **Reparación Retroactiva Final**: Ejecutar un script para migrar todos los nombres crudos de \`venta\` y \`abono\` al \`alias\` oficial de sus respectivos vendedores, garantizando el 100% de cruce.\n`;

fs.writeFileSync(path.join(__dirname, '../outputs/AUDIT_REPORT.md'), report);
console.log('Report generated at outputs/AUDIT_REPORT.md');
