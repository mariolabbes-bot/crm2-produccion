const XLSX = require('xlsx');
const pool = require('../src/db');

// Función para limpiar RUT (quitar puntos y guiones)
function cleanRut(rut) {
  if (!rut) return null;
  return rut.toString().replace(/\./g, '').replace(/-/g, '').trim();
}

// Función para limpiar nombre del vendedor
function normalizeVendedorName(nombre) {
  if (!nombre) return null;
  // Convertir a formato similar a los nombres en la BD
  // Ejemplo: "Maiko Ricardo Flores Maldonado" -> "MAIKO FLORES"
  const parts = nombre.trim().split(' ');
  if (parts.length >= 2) {
    // Tomar primer nombre y primer apellido
    return `${parts[0].toUpperCase()} ${parts[parts.length - 2].toUpperCase()}`;
  }
  return nombre.toUpperCase().trim();
}

async function importClients(filePath) {
  console.log('📂 Leyendo archivo:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'BASE CLIENTES ACTIVOS';
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total de clientes en Excel: ${data.length}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Cargar todos los vendedores en memoria
    console.log('🔍 Cargando vendedores...');
    const vendedoresResult = await client.query('SELECT id, nombre FROM users WHERE rol = \'vendedor\'');
    const vendedoresByNombre = new Map();
    
    // Crear múltiples variantes de nombre para mejor matching
    vendedoresResult.rows.forEach(v => {
      const nombre = v.nombre.toUpperCase().trim();
      vendedoresByNombre.set(nombre, v.id);
      
      // También agregar versión sin segundo nombre/apellido
      const parts = nombre.split(' ');
      if (parts.length >= 2) {
        const shortName = `${parts[0]} ${parts[parts.length - 1]}`;
        vendedoresByNombre.set(shortName, v.id);
      }
    });
    
    console.log(`✅ ${vendedoresResult.rows.length} vendedores cargados`);
    console.log('Variantes de nombres:', Array.from(vendedoresByNombre.keys()).slice(0, 10));
    
    // 2. Obtener el ID del manager para clientes sin vendedor asignado
    const managerResult = await client.query('SELECT id FROM users WHERE rol = \'manager\' LIMIT 1');
    const managerId = managerResult.rows[0]?.id || 1;
    
    // 3. Insertar clientes
    console.log('💾 Insertando clientes...');
    let insertedCount = 0;
    let skippedCount = 0;
    let vendedorNotFoundCount = 0;
    const errors = [];
    
    for (const row of data) {
      try {
        const rut = cleanRut(row.Identificador);
        if (!rut) {
          errors.push({ nombre: row.Nombre, motivo: 'RUT inválido' });
          skippedCount++;
          continue;
        }
        
        // Buscar vendedor
        const vendedorNormalizado = normalizeVendedorName(row.NombreVendedor);
        let vendedorId = vendedoresByNombre.get(vendedorNormalizado);
        
        if (!vendedorId) {
          // Intentar match parcial
          for (const [nombre, id] of vendedoresByNombre) {
            if (nombre.includes(vendedorNormalizado?.split(' ')[0] || '')) {
              vendedorId = id;
              break;
            }
          }
        }
        
        if (!vendedorId) {
          vendedorId = managerId;
          vendedorNotFoundCount++;
        }
        
        const nombre = row.Nombre || 'Sin nombre';
        const telefono = row.TelefonoPrincipal ? row.TelefonoPrincipal.toString() : null;
        const direccion = row.Direccion || null;
        const numero = row.Numero || null;
        const direccionCompleta = numero ? `${direccion} ${numero}` : direccion;
        const ciudad = row.Ciudad || row.Comuna || null;
        const estado = row.Comuna || null;
        
        // Insertar cliente
        const result = await client.query(`
          INSERT INTO clients (
            rut, nombre, telefono, direccion, ciudad, estado, vendedor_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (rut) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            telefono = EXCLUDED.telefono,
            direccion = EXCLUDED.direccion,
            ciudad = EXCLUDED.ciudad,
            estado = EXCLUDED.estado,
            vendedor_id = EXCLUDED.vendedor_id
          RETURNING id
        `, [rut, nombre, telefono, direccionCompleta, ciudad, estado, vendedorId]);
        
        if (result.rows.length > 0) {
          insertedCount++;
          
          if (insertedCount % 500 === 0) {
            console.log(`  ⏳ Procesados ${insertedCount} clientes...`);
          }
        }
        
      } catch (err) {
        errors.push({ nombre: row.Nombre, rut: row.Identificador, motivo: err.message });
        skippedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Importación de clientes completada:');
    console.log(`   📥 Clientes procesados: ${insertedCount}`);
    console.log(`   ⏭️  Clientes omitidos: ${skippedCount}`);
    console.log(`   ⚠️  Vendedores no encontrados (asignados a manager): ${vendedorNotFoundCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errores (primeros 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.nombre} (${err.rut}): ${err.motivo}`);
      });
    }
    
    // Mostrar estadísticas
    const stats = await client.query(`
      SELECT 
        u.nombre as vendedor,
        COUNT(c.id) as total_clientes
      FROM users u
      LEFT JOIN clients c ON c.vendedor_id = u.id
      WHERE u.rol = 'vendedor'
      GROUP BY u.id, u.nombre
      ORDER BY total_clientes DESC
    `);
    
    console.log('\n📊 Clientes por vendedor:');
    console.table(stats.rows);
    
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

importClients(filePath)
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
