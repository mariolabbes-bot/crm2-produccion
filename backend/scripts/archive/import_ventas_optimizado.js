const XLSX = require('xlsx');
const { Pool } = require('pg');

// Conectar directamente a Neon DB (producción)
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';
const BATCH_SIZE = 500; // Insertar en lotes de 500

console.log('🔗 Conectando a: Neon DB (producción)');

// Función para convertir número serial de Excel a fecha
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

// Función para limpiar RUT
function cleanRut(rut) {
  if (!rut) return null;
  return rut.toString().replace(/\./g, '').replace(/-/g, '').trim();
}

// Función para limpiar texto
function cleanText(text) {
  if (!text) return null;
  return text.toString().trim();
}

async function importarVentas() {
  console.log('📂 Leyendo archivo Excel:', EXCEL_PATH);
  
  const workbook = XLSX.readFile(EXCEL_PATH);
  const ventasSheet = workbook.Sheets['VENTAS 2024-2025'];
  const ventasData = XLSX.utils.sheet_to_json(ventasSheet);
  
  console.log(`📊 Total ventas en Excel: ${ventasData.length}`);
  
  const client = await pool.connect();
  
  try {
    // Cargar vendedores existentes
    const vendedoresResult = await client.query('SELECT id, nombre FROM users WHERE rol IN (\'vendedor\', \'manager\')');
    const vendedoresByNombre = new Map();
    vendedoresResult.rows.forEach(v => {
      vendedoresByNombre.set(v.nombre.toLowerCase().trim(), v.id);
    });
    console.log(`✅ ${vendedoresByNombre.size} vendedores encontrados`);
    
    // Agrupar ventas por factura (Identificador + Folio)
    console.log('📦 Procesando facturas...');
    const facturas = new Map();
    
    ventasData.forEach(row => {
      const key = `${row.Identificador}-${row.Folio}`;
      if (!facturas.has(key)) {
        facturas.set(key, {
          identificador: row.Identificador,
          folio: row.Folio,
          fecha_emision: excelDateToJSDate(row['Fecha Emisión']),
          rut_cliente: cleanRut(row['Rut Cliente']),
          razon_social: cleanText(row['Razón Social']),
          vendedor: cleanText(row.Vendedor),
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
    
    // Preparar datos para inserción por lotes
    const ventasParaInsertar = [];
    let sinVendedor = 0;
    
    for (const [key, factura] of facturas) {
      const vendedorNombre = factura.vendedor?.toLowerCase().trim();
      let vendedor_id = vendedoresByNombre.get(vendedorNombre) || null;
      
      // Si no tiene vendedor asignado, asignar al Manager (id 6) por defecto
      if (!vendedor_id) {
        vendedor_id = 6; // Manager
        sinVendedor++;
      }
      
      const total_iva = factura.total_neto * 0.19;
      const total_venta = factura.total_neto + total_iva;
      
      ventasParaInsertar.push({
        vendedor_id,
        fecha_emision: factura.fecha_emision,
        total_venta,
        cliente_nombre: factura.razon_social
      });
    }
    
    console.log(`📥 Insertando ${ventasParaInsertar.length} ventas en lotes de ${BATCH_SIZE}...`);
    console.log(`⚠️  ${sinVendedor} ventas sin vendedor asignado`);
    
    // Insertar en lotes
    let insertadas = 0;
    for (let i = 0; i < ventasParaInsertar.length; i += BATCH_SIZE) {
      const batch = ventasParaInsertar.slice(i, i + BATCH_SIZE);
      
      await client.query('BEGIN');
      
      for (const venta of batch) {
        await client.query(
          'INSERT INTO sales (vendedor_id, fecha_emision, total_venta, cliente_nombre) VALUES ($1, $2, $3, $4)',
          [venta.vendedor_id, venta.fecha_emision, venta.total_venta, venta.cliente_nombre]
        );
        insertadas++;
      }
      
      await client.query('COMMIT');
      console.log(`✅ Insertadas ${insertadas}/${ventasParaInsertar.length} ventas (${Math.round(insertadas/ventasParaInsertar.length*100)}%)`);
    }
    
    console.log(`\n✅ Importación completada:`);
    console.log(`   - Ventas insertadas: ${insertadas}`);
    console.log(`   - Sin vendedor: ${sinVendedor}`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la importación:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
importarVentas()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
