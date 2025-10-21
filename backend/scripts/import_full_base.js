const XLSX = require('xlsx');
const { Pool } = require('pg');

// Conectar directamente a Neon DB (producción)
const NEON_URL = 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

console.log('🔗 Conectando a: Neon DB (producción)');

// Parse fecha de Excel: soporta serial, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
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
    // ISO o similar
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    // DD/MM/YYYY o DD-MM-YYYY
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, '0');
      const mm = String(m[2]).padStart(2, '0');
      let yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    // Fallback Date parse
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  return null;
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
  const ventasData = XLSX.utils.sheet_to_json(ventasSheet, { raw: true });
  
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
    // Manager por defecto
    const managerRes = await client.query("SELECT id FROM users WHERE rol = 'manager' ORDER BY id ASC LIMIT 1");
    const defaultManagerId = managerRes.rows?.[0]?.id || null;
    
    // Descubrir nombres reales de columnas (por posibles problemas de encoding)
    const headers = Object.keys(ventasData[0] || {});
    const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

    const colFolio = findCol([/^Folio$/i]);
    const colIdentificador = findCol([/^Identificador$/i]);
    const colFecha = findCol([/Fecha/i]); // coincide con 'Fecha emisión' con encoding extraño
    const colCliente = findCol([/^Cliente$/i]);
    const colVendedorDoc = findCol([/^Vendedor documento$/i, /^Vendedor cliente$/i, /^Vendedor$/i]);
    const colSKU = findCol([/^SKU$/i]);
    const colDescripcion = findCol([/^Descripción/i, /^Descripcion/i]);
    const colCantidad = findCol([/^Cantidad$/i]);
    const colPrecio = findCol([/^Precio( Unitario)?$/i]);

    if (!colFolio || !colIdentificador || !colFecha || !colCliente || !colCantidad || !colPrecio) {
      console.error('❌ Columnas requeridas no encontradas:', { colFolio, colIdentificador, colFecha, colCliente, colCantidad, colPrecio });
      throw new Error('No se encontraron columnas requeridas en la hoja de ventas');
    }

    // Agrupar ventas por factura (Identificador + Folio)
    console.log('📦 Procesando facturas...');
    const facturas = new Map();
    
    ventasData.forEach(row => {
      const key = `${row[colIdentificador]}-${row[colFolio]}`;
      if (!facturas.has(key)) {
        facturas.set(key, {
          identificador: row[colIdentificador],
          folio: row[colFolio],
          fecha_emision: parseExcelDate(row[colFecha]),
          cliente_nombre: cleanText(row[colCliente]),
          vendedor: cleanText(colVendedorDoc ? row[colVendedorDoc] : null),
          total_neto: 0,
          total_iva: 0,
          total_factura: 0,
          lineas: []
        });
      }
      
      const factura = facturas.get(key);
      const precioUnitario = parseFloat(row[colPrecio]) || 0;
      const cantidad = parseFloat(row[colCantidad]) || 0;
      const descuento = parseFloat(row['% Descuento'] || 0) || 0;
      const subtotal = precioUnitario * cantidad;
      const montoDescuento = subtotal * (descuento / 100);
      const neto = subtotal - montoDescuento;
      
      factura.total_neto += neto;
      factura.lineas.push({
        sku: cleanText(colSKU ? row[colSKU] : null),
        descripcion: cleanText(colDescripcion ? row[colDescripcion] : null),
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        descuento: descuento,
        neto: neto
      });
    });
    
    console.log(`✅ ${facturas.size} facturas agrupadas`);
    
    // Insertar ventas
    let insertadas = 0;
    let errores = 0;
    let sinVendedor = 0;
    const LIMIT = parseInt(process.env.IMPORT_LIMIT || '0', 10);
    const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
    const SLEEP_MS = parseInt(process.env.SLEEP_MS || '300', 10);

    // Limpieza opcional
    if (process.env.CLEAN_SALES === '1') {
      console.log('🧹 Limpiando tabla sales (CLEAN_SALES=1)...');
      await client.query('DELETE FROM sales');
    }

    console.log(`📥 Insertando ventas en lotes de ${BATCH_SIZE}...`);
    let buffer = [];
    let processed = 0;

    const flush = async () => {
      if (buffer.length === 0) return;
      const values = [];
      const params = [];
      let p = 1;
      for (const rec of buffer) {
        values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(rec.vendedor_id, rec.fecha_emision, rec.total_venta, rec.cliente_nombre);
      }
      const sql = `INSERT INTO sales (vendedor_id, fecha_emision, total_venta, cliente_nombre) VALUES ${values.join(',')}`;
      try {
        await client.query(sql, params);
        insertadas += buffer.length;
        if (insertadas % 1000 === 0) console.log(`✅ Insertadas ${insertadas} ventas...`);
      } catch (e) {
        errores += buffer.length;
        console.error('❌ Error insertando lote:', e.message);
      } finally {
        buffer = [];
      }
      // Pequeña pausa para evitar timeouts
      await new Promise(r => setTimeout(r, SLEEP_MS));
    };

    for (const [key, factura] of facturas) {
      // Buscar vendedor_id
      const vendedorNombre = factura.vendedor?.toLowerCase().trim();
      let vendedor_id = vendedoresByNombre.get(vendedorNombre) || defaultManagerId || null;
      if (!vendedor_id) sinVendedor++;

      // Calcular IVA (19%)
      const total_iva = factura.total_neto * 0.19;
      const total_venta = factura.total_neto + total_iva;

      buffer.push({
        vendedor_id,
        fecha_emision: factura.fecha_emision,
        total_venta,
        cliente_nombre: factura.cliente_nombre
      });
      processed++;

      if (buffer.length >= BATCH_SIZE) {
        await flush();
      }

      if (LIMIT > 0 && processed >= LIMIT) break;
    }

    // Flush final
    await flush();
    
    console.log(`\n✅ Importación completada:`);
  console.log(`   - Ventas insertadas: ${insertadas}`);
    console.log(`   - Sin vendedor: ${sinVendedor}`);
    console.log(`   - Errores: ${errores}`);
    
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
