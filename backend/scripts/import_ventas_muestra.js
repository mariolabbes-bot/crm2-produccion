const XLSX = require('xlsx');
const { Pool } = require('pg');

// Conectar directamente a Neon DB (producción)
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';
const MAX_VENTAS = 1000; // Solo importar 1000 para prueba

console.log('🔗 Conectando a: Neon DB (producción)');

// Función para convertir número serial de Excel a fecha
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

function cleanText(text) {
  if (!text) return null;
  return text.toString().trim();
}

async function importarVentasMuestra() {
  console.log('📂 Leyendo archivo Excel:', EXCEL_PATH);
  
  const workbook = XLSX.readFile(EXCEL_PATH);
  const ventasSheet = workbook.Sheets['VENTAS 2024-2025'];
  const ventasData = XLSX.utils.sheet_to_json(ventasSheet);
  
  console.log(`📊 Total ventas en Excel: ${ventasData.length}`);
  console.log(`📥 Importando solo las primeras ${MAX_VENTAS} facturas para prueba...`);
  
  const client = await pool.connect();
  
  try {
    // Agrupar ventas por factura
    const facturas = new Map();
    
    ventasData.forEach(row => {
      const key = `${row.Identificador}-${row.Folio}`;
      if (!facturas.has(key)) {
        facturas.set(key, {
          fecha_emision: excelDateToJSDate(row['Fecha Emisión']),
          razon_social: cleanText(row['Razón Social']),
          total_neto: 0
        });
      }
      
      const factura = facturas.get(key);
      const precioUnitario = parseFloat(row['Precio Unitario']) || 0;
      const cantidad = parseFloat(row.Cantidad) || 0;
      const descuento = parseFloat(row['% Descuento']) || 0;
      const subtotal = precioUnitario * cantidad;
      const montoDescuento = subtotal * (descuento / 100);
      const neto = subtotal - montoDescuento;
      
      factura.total_neto += neto;
    });
    
    console.log(`✅ ${facturas.size} facturas agrupadas`);
    
    // Tomar solo las primeras MAX_VENTAS
    const ventas = Array.from(facturas.values()).slice(0, MAX_VENTAS);
    
    console.log(`📥 Insertando ${ventas.length} ventas...`);
    
    await client.query('BEGIN');
    
    let insertadas = 0;
    for (const venta of ventas) {
      const total_iva = venta.total_neto * 0.19;
      const total_venta = venta.total_neto + total_iva;
      
      await client.query(
        'INSERT INTO sales (vendedor_id, fecha_emision, total_venta, cliente_nombre) VALUES ($1, $2, $3, $4)',
        [6, venta.fecha_emision, total_venta, venta.razon_social] // vendedor_id = 6 (Manager)
      );
      insertadas++;
      
      if (insertadas % 100 === 0) {
        console.log(`  ✅ ${insertadas}/${ventas.length} (${Math.round(insertadas/ventas.length*100)}%)`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Importación completada: ${insertadas} ventas insertadas`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importarVentasMuestra()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
