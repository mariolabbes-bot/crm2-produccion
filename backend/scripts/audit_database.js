const pool = require('../src/db');

async function auditDatabase() {
  console.log('🔍 AUDITORÍA DE CONSISTENCIA DE DATOS\n');
  console.log('='.repeat(70));
  
  try {
    // ========== CLIENTES ==========
    console.log('\n📋 TABLA: CLIENTS');
    console.log('-'.repeat(70));
    
    const totalClients = await pool.query('SELECT COUNT(*) as total FROM clients');
    console.log(`Total de clientes: ${totalClients.rows[0].total}`);
    
    // Duplicados por RUT
    const dupRut = await pool.query(`
      SELECT rut, COUNT(*) as cantidad
      FROM clients
      GROUP BY rut
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
      LIMIT 10
    `);
    console.log(`\nDuplicados por RUT: ${dupRut.rows.length}`);
    if (dupRut.rows.length > 0) {
      console.table(dupRut.rows);
    }
    
    // Campos vacíos o nulos
    const nullFields = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE nombre IS NULL OR nombre = '') as nombre_vacio,
        COUNT(*) FILTER (WHERE rut IS NULL OR rut = '') as rut_vacio,
        COUNT(*) FILTER (WHERE telefono IS NULL OR telefono = '') as telefono_vacio,
        COUNT(*) FILTER (WHERE email IS NULL OR email = '') as email_vacio,
        COUNT(*) FILTER (WHERE direccion IS NULL OR direccion = '') as direccion_vacio,
        COUNT(*) FILTER (WHERE vendedor_id IS NULL) as sin_vendedor
      FROM clients
    `);
    console.log('\nCampos vacíos/nulos:');
    console.table(nullFields.rows);
    
    // Clientes sin vendedor asignado
    const sinVendedor = await pool.query(`
      SELECT COUNT(*) as total
      FROM clients
      WHERE vendedor_id NOT IN (SELECT id FROM users WHERE rol = 'vendedor')
    `);
    console.log(`\nClientes asignados a usuario no-vendedor: ${sinVendedor.rows[0].total}`);
    
    // ========== PRODUCTOS ==========
    console.log('\n\n📦 TABLA: PRODUCTS');
    console.log('-'.repeat(70));
    
    const totalProducts = await pool.query('SELECT COUNT(*) as total FROM products');
    console.log(`Total de productos: ${totalProducts.rows[0].total}`);
    
    // Duplicados por SKU
    const dupSku = await pool.query(`
      SELECT sku, COUNT(*) as cantidad
      FROM products
      GROUP BY sku
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
      LIMIT 10
    `);
    console.log(`\nDuplicados por SKU: ${dupSku.rows.length}`);
    if (dupSku.rows.length > 0) {
      console.table(dupSku.rows);
    }
    
    // Campos vacíos
    const nullProductFields = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE sku IS NULL OR sku = '') as sku_vacio,
        COUNT(*) FILTER (WHERE articulo IS NULL OR articulo = '') as articulo_vacio,
        COUNT(*) FILTER (WHERE marca IS NULL OR marca = '') as marca_vacio,
        COUNT(*) FILTER (WHERE linea IS NULL OR linea = '') as linea_vacio,
        COUNT(*) FILTER (WHERE sublinea IS NULL OR sublinea = '') as sublinea_vacio,
        COUNT(*) FILTER (WHERE litros IS NULL) as sin_litros
      FROM products
    `);
    console.log('\nCampos vacíos/nulos:');
    console.table(nullProductFields.rows);
    
    // ========== VENTAS ==========
    console.log('\n\n💰 TABLA: SALES (Cabecera)');
    console.log('-'.repeat(70));
    
    const totalSales = await pool.query('SELECT COUNT(*) as total FROM sales');
    console.log(`Total de ventas: ${totalSales.rows[0].total}`);
    
    // Duplicados por folio+cliente
    const dupSales = await pool.query(`
      SELECT folio, client_id, COUNT(*) as cantidad
      FROM sales
      GROUP BY folio, client_id
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
      LIMIT 10
    `);
    console.log(`\nDuplicados por folio+cliente: ${dupSales.rows.length}`);
    if (dupSales.rows.length > 0) {
      console.table(dupSales.rows);
    }
    
    // Ventas sin items
    const sinItems = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales s
      WHERE NOT EXISTS (SELECT 1 FROM sales_items si WHERE si.sale_id = s.id)
    `);
    console.log(`\nVentas sin items: ${sinItems.rows[0].total}`);
    
    // Campos vacíos
    const nullSalesFields = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE folio IS NULL OR folio = '') as folio_vacio,
        COUNT(*) FILTER (WHERE fecha_emision IS NULL) as fecha_vacio,
        COUNT(*) FILTER (WHERE client_id IS NULL) as sin_cliente,
        COUNT(*) FILTER (WHERE vendedor_id IS NULL) as sin_vendedor,
        COUNT(*) FILTER (WHERE total_venta IS NULL OR total_venta = 0) as total_cero
      FROM sales
    `);
    console.log('\nCampos vacíos/nulos:');
    console.table(nullSalesFields.rows);
    
    // Estadísticas de ventas por año
    const ventasPorAnio = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM fecha_emision) as anio,
        COUNT(*) as total_ventas,
        SUM(total_venta) as monto_total
      FROM sales
      GROUP BY EXTRACT(YEAR FROM fecha_emision)
      ORDER BY anio DESC
    `);
    console.log('\nVentas por año:');
    console.table(ventasPorAnio.rows);
    
    // ========== ITEMS DE VENTA ==========
    console.log('\n\n📝 TABLA: SALES_ITEMS (Detalle)');
    console.log('-'.repeat(70));
    
    const totalItems = await pool.query('SELECT COUNT(*) as total FROM sales_items');
    console.log(`Total de items: ${totalItems.rows[0].total}`);
    
    // Items sin SKU
    const sinSku = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales_items
      WHERE sku IS NULL OR sku = ''
    `);
    console.log(`\nItems sin SKU: ${sinSku.rows[0].total}`);
    
    // Items sin información de producto (marca, línea, sublínea)
    const sinInfoProducto = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE marca IS NULL OR marca = '') as sin_marca,
        COUNT(*) FILTER (WHERE linea IS NULL OR linea = '') as sin_linea,
        COUNT(*) FILTER (WHERE sublinea IS NULL OR sublinea = '') as sin_sublinea
      FROM sales_items
    `);
    console.log('\nItems sin info de producto:');
    console.table(sinInfoProducto.rows);
    
    // Items con valor_total = 0 o NULL
    const valorCero = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales_items
      WHERE valor_total IS NULL OR valor_total = 0
    `);
    console.log(`\nItems con valor_total = 0 o NULL: ${valorCero.rows[0].total}`);
    
    // Items con cantidad = 0 o negativa
    const cantidadAnormal = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales_items
      WHERE cantidad IS NULL OR cantidad <= 0
    `);
    console.log(`Items con cantidad <= 0 o NULL: ${cantidadAnormal.rows[0].total}`);
    
    // SKUs en ventas que no existen en products
    const skuNoExiste = await pool.query(`
      SELECT COUNT(DISTINCT sku) as total
      FROM sales_items
      WHERE sku IS NOT NULL 
        AND sku != ''
        AND sku NOT IN (SELECT sku FROM products)
    `);
    console.log(`\nSKUs en ventas no existentes en catálogo: ${skuNoExiste.rows[0].total}`);
    
    // Top 10 SKUs sin info de producto
    const topSkuSinInfo = await pool.query(`
      SELECT sku, COUNT(*) as veces_vendido
      FROM sales_items
      WHERE (marca IS NULL OR marca = '')
        AND sku IS NOT NULL
        AND sku != ''
      GROUP BY sku
      ORDER BY veces_vendido DESC
      LIMIT 10
    `);
    console.log('\nTop 10 SKUs vendidos sin info de producto:');
    console.table(topSkuSinInfo.rows);
    
    // ========== INTEGRIDAD REFERENCIAL ==========
    console.log('\n\n🔗 INTEGRIDAD REFERENCIAL');
    console.log('-'.repeat(70));
    
    // Ventas con cliente inexistente
    const ventasClienteInvalido = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales
      WHERE client_id NOT IN (SELECT id FROM clients)
    `);
    console.log(`Ventas con cliente inexistente: ${ventasClienteInvalido.rows[0].total}`);
    
    // Ventas con vendedor inexistente
    const ventasVendedorInvalido = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales
      WHERE vendedor_id NOT IN (SELECT id FROM users)
    `);
    console.log(`Ventas con vendedor inexistente: ${ventasVendedorInvalido.rows[0].total}`);
    
    // Items con venta inexistente
    const itemsVentaInvalida = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales_items
      WHERE sale_id NOT IN (SELECT id FROM sales)
    `);
    console.log(`Items con venta inexistente: ${itemsVentaInvalida.rows[0].total}`);
    
    // ========== RESUMEN GENERAL ==========
    console.log('\n\n📊 RESUMEN GENERAL');
    console.log('-'.repeat(70));
    
    const resumen = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM clients) as total_clientes,
        (SELECT COUNT(*) FROM users WHERE rol = 'vendedor') as total_vendedores,
        (SELECT COUNT(*) FROM products) as total_productos,
        (SELECT COUNT(*) FROM sales) as total_ventas,
        (SELECT COUNT(*) FROM sales_items) as total_items_vendidos,
        (SELECT SUM(total_venta) FROM sales) as monto_total_ventas
    `);
    console.table(resumen.rows);
    
    // Promedio de items por venta
    const promedioItems = await pool.query(`
      SELECT 
        ROUND(AVG(items_count), 2) as promedio_items_por_venta,
        MAX(items_count) as max_items,
        MIN(items_count) as min_items
      FROM (
        SELECT sale_id, COUNT(*) as items_count
        FROM sales_items
        GROUP BY sale_id
      ) sub
    `);
    console.log('\nEstadísticas de items por venta:');
    console.table(promedioItems.rows);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Auditoría completada\n');
    
  } catch (err) {
    console.error('❌ Error durante auditoría:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

auditDatabase();
