require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

const excelPath = process.env.EXCEL_ABONOS_PATH || '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

async function detectAbonosTable(client) {
  const { rows } = await client.query(`
    SELECT 
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abonos') AS has_abonos,
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'abono') AS has_abono
  `);
  const r = rows[0] || {};
  return r.has_abonos ? 'abonos' : (r.has_abono ? 'abono' : null);
}

// Función para convertir fecha a formato YYYY-MM-DD
function formatDate(dateValue) {
  if (!dateValue) {
    return null;
  }
  
  try {
    // Si ya es un objeto Date
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        return null;
      }
      return dateValue.toISOString().split('T')[0];
    }
    
    // Si es un string de fecha ISO
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    }
    
    // Si es un número de Excel
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Mapeo de vendedores: nombre en Excel → nombre en DB
const vendedorMapping = {
  'omar': 'OMAR MALDONADO',
  'nelson': 'NELSON MUÑOZ',
  'alex': 'ALEX MONDACA',
  'matias felipe': 'MATIAS TAPIA',
  'maiko': 'MAIKO FLORES',
  'nataly': 'NATALY CARRASCO',
  'victoria': 'VICTORIA HURTADO',
  'roberto': 'ROBERTO OYARZUN',
  'joaquin': 'JOAQUIN MANRIQUEZ',
  'jorge': 'JORGE GUTIERREZ',
  'emilio': 'EMILIO SANTOS',
  'eduardo': 'EDUARDO PONCE',
  'eduardo rojas': 'EDUARDO ROJAS',
  'marisol': 'MARISOL SANCHEZ',
  'matias ignacio': 'MATIAS TAPIA'
};

// Función para normalizar nombre de vendedor
function normalizeVendedorName(name) {
  if (!name) return null;
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
}

async function importAbonos() {
  const client = await pool.connect();
  
  try {
    console.log('📂 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath, { cellDates: true });
    const sheetName = 'ABONOS 2024-2025';
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ ${data.length} abonos encontrados en Excel\n`);
    
    // Obtener todos los vendedores para hacer el matching
    console.log('👥 Obteniendo vendedores de la base de datos...');
    const vendedoresResult = await client.query(`
      SELECT id, nombre 
      FROM users 
      WHERE rol IN ('vendedor', 'manager')
    `);
    
    const vendedores = new Map();
    vendedoresResult.rows.forEach(v => {
      const normalizedName = normalizeVendedorName(v.nombre);
      vendedores.set(normalizedName, v.id);
    });
    
    console.log(`✅ ${vendedores.size} vendedores encontrados\n`);
    
    // Obtener el manager por defecto para asignar cuando no se encuentra el vendedor
    const managerResult = await client.query(`
      SELECT id FROM users WHERE rol = 'manager' LIMIT 1
    `);
    const managerId = managerResult.rows[0]?.id;
    
  console.log('💾 Insertando abonos...\n');
  const abonosTable = await detectAbonosTable(client);
  if (!abonosTable) throw new Error('No se encontró tabla de abonos (abonos/abono)');
    
    let imported = 0;
    let errors = 0;
    let vendedorNotFound = 0;
    let fechasInvalidas = 0;
    
    const batchSize = 1000;
    let batch = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Obtener fecha
        const fechaAbono = formatDate(row['Fecha']);
        if (!fechaAbono) {
          fechasInvalidas++;
          continue;
        }
        
        // Obtener monto
        const monto = parseFloat(row['Monto']) || 0;
        if (monto <= 0) {
          continue; // Saltar abonos sin monto
        }
        
        // Buscar vendedor usando el mapeo
        const vendedorExcelNombre = normalizeVendedorName(row['Vendedor cliente']);
        let vendedorId = null;
        
        // Primero intentar con el mapeo
        if (vendedorExcelNombre && vendedorMapping[vendedorExcelNombre]) {
          const mappedNombre = normalizeVendedorName(vendedorMapping[vendedorExcelNombre]);
          vendedorId = vendedores.get(mappedNombre);
        }
        
        // Si no se encontró con el mapeo, buscar directamente
        if (!vendedorId && vendedorExcelNombre) {
          vendedorId = vendedores.get(vendedorExcelNombre);
        }
        
        // Si aún no se encuentra, asignar al manager
        if (!vendedorId) {
          vendedorId = managerId;
          vendedorNotFound++;
        }
        
        // Preparar datos
        const folio = row['Folio'] ? String(row['Folio']) : null;
        const clienteNombre = row['Cliente'] ? String(row['Cliente']).trim() : null;
        const tipoPago = row['Tipo pago'] ? String(row['Tipo pago']).trim() : null;
        const estadoAbono = row['Estado abono'] ? String(row['Estado abono']).trim() : null;
        const descripcion = estadoAbono ? `${estadoAbono}` : null;
        
        batch.push({
          vendedorId,
          fechaAbono,
          monto,
          descripcion,
          folio,
          clienteNombre,
          tipoPago
        });
        
        // Insertar en lotes
        if (batch.length >= batchSize) {
          await insertBatch(client, batch, abonosTable);
          imported += batch.length;
          batch = [];
          
          // Mostrar progreso
          const progress = ((i + 1) / data.length * 100).toFixed(1);
          process.stdout.write(`\r⏳ Progreso: ${progress}% (${imported} abonos importados)`);
        }
        
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`\n⚠️  Error en fila ${i + 1}:`, error.message);
        }
      }
    }
    
    // Insertar el último lote
    if (batch.length > 0) {
  await insertBatch(client, batch, abonosTable);
      imported += batch.length;
    }
    
    console.log('\n\n✅ Importación completada!\n');
    console.log('📊 Resumen:');
    console.log(`   Total procesados: ${data.length}`);
    console.log(`   Importados exitosamente: ${imported}`);
    console.log(`   Fechas inválidas: ${fechasInvalidas}`);
    console.log(`   Vendedores no encontrados: ${vendedorNotFound} (asignados al manager)`);
    console.log(`   Errores: ${errors}\n`);
    
    // Estadísticas
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_abonos,
        SUM(monto) as monto_total,
        AVG(monto) as promedio_abono,
        MIN(fecha_abono) as fecha_primera,
        MAX(fecha_abono) as fecha_ultima,
        COUNT(DISTINCT vendedor_id) as total_vendedores,
        COUNT(DISTINCT tipo_pago) as tipos_pago_diferentes
      FROM ${abonosTable}
    `);
    
    console.log('📈 Estadísticas de abonos:');
    console.table(stats.rows);
    
    // Abonos por vendedor
    const porVendedor = await client.query(`
      SELECT 
        u.nombre as vendedor,
        COUNT(*) as cantidad_abonos,
        SUM(a.monto) as monto_total,
        AVG(a.monto)::numeric(15,2) as promedio
      FROM ${abonosTable} a
      JOIN users u ON a.vendedor_id = u.id
      GROUP BY u.id, u.nombre
      ORDER BY monto_total DESC
      LIMIT 10
    `);
    
    console.log('\n🏆 Top 10 vendedores por monto de abonos:');
    console.table(porVendedor.rows);
    
    // Tipos de pago
    const tiposPago = await client.query(`
      SELECT 
        COALESCE(tipo_pago, 'Sin especificar') as tipo_pago,
        COUNT(*) as cantidad,
        SUM(monto) as monto_total
      FROM ${abonosTable}
      GROUP BY tipo_pago
      ORDER BY monto_total DESC
    `);
    
    console.log('\n💳 Distribución por tipo de pago:');
    console.table(tiposPago.rows);
    
  } catch (error) {
    console.error('\n❌ Error general:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function insertBatch(client, batch, abonosTable) {
  const values = [];
  const placeholders = [];
  
  batch.forEach((item, index) => {
    const offset = index * 7;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
    );
    values.push(
      item.vendedorId,
      item.fechaAbono,
      item.monto,
      item.descripcion,
      item.folio,
      item.clienteNombre,
      item.tipoPago
    );
  });
  
  const query = `
    INSERT INTO ${abonosTable} (vendedor_id, fecha_abono, monto, descripcion, folio, cliente_nombre, tipo_pago)
    VALUES ${placeholders.join(', ')}
  `;
  
  await client.query(query, values);
}

importAbonos();
