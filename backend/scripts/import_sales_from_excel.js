const XLSX = require('xlsx');
const pool = require('../src/db');

// Función para convertir número serial de Excel a fecha
function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  
  // Excel serial date: días desde 1900-01-01
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  return date_info.toISOString().split('T')[0]; // Retorna solo YYYY-MM-DD
}

// Función para limpiar RUT (quitar puntos y guiones)
function cleanRut(rut) {
  if (!rut) return null;
  return rut.toString().replace(/\./g, '').replace(/-/g, '').trim();
}

async function importSalesFromExcel(filePath) {
  console.log('📂 Leyendo archivo:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'VENTAS 2024-2025';
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total de líneas en Excel: ${data.length}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Cargar todos los clientes, vendedores y productos en memoria
    console.log('🔍 Cargando clientes...');
    const clientsResult = await client.query('SELECT id, rut, vendedor_id FROM clients');
    const clientsByRut = new Map();
    clientsResult.rows.forEach(c => {
      const cleanedRut = cleanRut(c.rut);
      if (cleanedRut) {
        clientsByRut.set(cleanedRut, { id: c.id, vendedor_id: c.vendedor_id });
      }
    });
    console.log(`✅ ${clientsByRut.size} clientes cargados`);
    
    console.log('🔍 Cargando vendedores...');
    const vendedoresResult = await client.query('SELECT id, nombre FROM users WHERE rol = \'vendedor\'');
    const vendedoresByNombre = new Map();
    vendedoresResult.rows.forEach(v => {
      vendedoresByNombre.set(v.nombre.toLowerCase().trim(), v.id);
    });
    console.log(`✅ ${vendedoresByNombre.size} vendedores cargados`);
    
    console.log('🔍 Cargando productos...');
    const productsResult = await client.query('SELECT sku, marca, linea, sublinea FROM products');
    const productsBySku = new Map();
    productsResult.rows.forEach(p => {
      if (p.sku) {
        productsBySku.set(p.sku.toUpperCase().trim(), {
          marca: p.marca,
          linea: p.linea,
          sublinea: p.sublinea
        });
      }
    });
    console.log(`✅ ${productsBySku.size} productos cargados`);
    
    // 2. Agrupar líneas por factura (Identificador + Folio)
    console.log('📦 Agrupando líneas por factura...');
    const facturas = new Map();
    
    data.forEach(row => {
      const key = `${row.Identificador}-${row.Folio}`;
      if (!facturas.has(key)) {
        facturas.set(key, {
          identificador: row.Identificador,
          folio: row.Folio,
          tipo_documento: row['Tipo de documento'],
          fecha_emision: row['Fecha emisión'] || row['Fecha emisi√≥n'],
          cliente: row.Cliente,
          vendedor_cliente: row['Vendedor cliente'],
          vendedor_documento: row['Vendedor documento'],
          sucursal: row.Sucursal,
          estado_sistema: row['Estado sistema'],
          estado_comercial: row['Estado comercial'],
          estado_sii: row['Estado SII'],
          items: []
        });
      }
      
      facturas.get(key).items.push({
        indice: row['Índice'] || row['√çndice'],
        sku: row.SKU,
        descripcion: row['Descripción'] || row['Descripci√≥n'],
        cantidad: row.Cantidad,
        precio_unitario: row.Precio || row[' Precio '],
        tipo_linea: row['Tipo línea'] || row['Tipo l√≠nea'],
        tipo_articulo: row['Tipo artículo'] || row['Tipo art√≠culo']
      });
    });
    
    console.log(`✅ ${facturas.size} facturas únicas encontradas`);
    
    // 3. Insertar ventas y sus items
    console.log('💾 Insertando ventas en base de datos...');
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const [key, factura] of facturas) {
      try {
        // Buscar cliente por RUT
        const cleanedRut = cleanRut(factura.identificador);
        const clientData = clientsByRut.get(cleanedRut);
        
        if (!clientData) {
          errors.push({ folio: factura.folio, rut: factura.identificador, motivo: 'Cliente no encontrado' });
          skippedCount++;
          continue;
        }
        
        // Buscar vendedor por nombre
        const vendedorNombre = (factura.vendedor_documento || '').toLowerCase().trim();
        let vendedorId = vendedoresByNombre.get(vendedorNombre);
        
        // Si no se encuentra el vendedor, usar el vendedor del cliente
        if (!vendedorId) {
          vendedorId = clientData.vendedor_id;
        }
        
        if (!vendedorId) {
          errors.push({ folio: factura.folio, motivo: 'Vendedor no encontrado' });
          skippedCount++;
          continue;
        }
        
        // Convertir fecha de Excel a formato Date
        let fechaEmision = null;
        if (typeof factura.fecha_emision === 'number') {
          fechaEmision = excelDateToJSDate(factura.fecha_emision);
        } else if (factura.fecha_emision) {
          fechaEmision = new Date(factura.fecha_emision).toISOString().split('T')[0];
        }
        
        if (!fechaEmision) {
          errors.push({ folio: factura.folio, motivo: 'Fecha inválida' });
          skippedCount++;
          continue;
        }
        
        // Calcular total de la venta
        const totalVenta = factura.items.reduce((sum, item) => sum + (item.valor_total || 0), 0);
        
        // Insertar venta (cabecera)
        const saleResult = await client.query(`
          INSERT INTO sales (
            client_id, vendedor_id, folio, tipo_documento, fecha_emision,
            sucursal, estado_sistema, estado_comercial, estado_sii, total_venta
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (client_id, folio) DO NOTHING
          RETURNING id
        `, [
          clientData.id, vendedorId, factura.folio, factura.tipo_documento, fechaEmision,
          factura.sucursal, factura.estado_sistema, factura.estado_comercial, 
          factura.estado_sii, totalVenta
        ]);
        
        if (saleResult.rows.length === 0) {
          skippedCount++;
          continue; // Ya existe
        }
        
        const saleId = saleResult.rows[0].id;
        
        // Insertar items de la venta
        for (const item of factura.items) {
          // Buscar información del producto
          const skuUpper = item.sku?.toString().toUpperCase().trim();
          const productInfo = skuUpper ? productsBySku.get(skuUpper) : null;
          
          // Calcular valor_total = cantidad × precio_unitario
          const cantidad = item.cantidad || 0;
          const precioUnitario = item.precio_unitario || 0;
          const valorTotal = cantidad * precioUnitario;
          
          // Usar marca, linea y sublinea de la tabla products
          const marca = productInfo?.marca || null;
          const linea = productInfo?.linea || null;
          const sublinea = productInfo?.sublinea || null;
          
          await client.query(`
            INSERT INTO sales_items (
              sale_id, indice, sku, descripcion, cantidad, precio_unitario,
              valor_total, tipo_linea, linea, sublinea, marca, tipo_articulo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            saleId, item.indice, item.sku, item.descripcion, cantidad,
            precioUnitario, valorTotal, item.tipo_linea,
            linea, sublinea, marca, item.tipo_articulo
          ]);
        }
        
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`  ⏳ Procesadas ${insertedCount} facturas...`);
        }
        
      } catch (err) {
        errors.push({ folio: factura.folio, motivo: err.message });
        skippedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Importación completada:');
    console.log(`   📥 Facturas insertadas: ${insertedCount}`);
    console.log(`   ⏭️  Facturas omitidas: ${skippedCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errores (primeros 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   - Folio ${err.folio}: ${err.motivo}`);
      });
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la importación:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Ejecutar importación
const filePath = process.argv[2] || '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

importSalesFromExcel(filePath)
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
