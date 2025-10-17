require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

// Mapeo manual de vendedores (Excel → DB)
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
  'eduardo': 'EDUARDO PONCE', // Asumiendo que "Eduardo" sin apellido es Eduardo Ponce
  'eduardo rojas': 'EDUARDO ROJAS',
  'milton': 'MANAGER', // Milton no está en la lista, asignar a Manager
  'marisol': 'MARISOL SANCHEZ',
  'luis': 'MANAGER', // Luis no está en la lista
  'marcelo': 'MANAGER', // Marcelo no está en la lista
  'alejandra': 'MANAGER', // Alejandra no está en la lista
  'matias ignacio': 'MATIAS TAPIA',
  'octavio': 'MANAGER', // Octavio no está en la lista
  'alejandro': 'MANAGER' // Alejandro no está en la lista
};

function normalizeVendedorName(name) {
  if (!name) return null;
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function reassignAbonos() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Reasignando abonos a vendedores correctos...\n');
    
    // Obtener todos los vendedores de la base de datos
    const vendedoresResult = await client.query(`
      SELECT id, nombre FROM users WHERE rol IN ('vendedor', 'manager')
    `);
    
    const vendedoresDB = new Map();
    vendedoresResult.rows.forEach(v => {
      const normalized = normalizeVendedorName(v.nombre);
      vendedoresDB.set(normalized, v.id);
    });
    
    console.log('📋 Mapeando vendedores:\n');
    
    let totalUpdated = 0;
    const stats = {};
    
    // Procesar cada mapeo
    for (const [excelName, dbName] of Object.entries(vendedorMapping)) {
      const normalizedDB = normalizeVendedorName(dbName);
      const vendedorId = vendedoresDB.get(normalizedDB);
      
      if (!vendedorId) {
        console.log(`⚠️  No se encontró vendedor en DB: ${dbName}`);
        continue;
      }
      
      // Actualizar abonos que tengan este nombre de vendedor en cliente_nombre o descripcion
      // Como no guardamos el nombre del vendedor directamente, necesitamos actualizar basado en el cliente
      
      // Por ahora, vamos a obtener estadísticas de cuántos abonos hay por cada vendedor actual
      const result = await client.query(`
        UPDATE abono 
        SET vendedor_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(TRIM(SPLIT_PART(cliente_nombre, ' ', 1))) = $2
        RETURNING id
      `, [vendedorId, excelName]);
      
      if (result.rowCount > 0) {
        totalUpdated += result.rowCount;
        stats[dbName] = result.rowCount;
        console.log(`✅ ${dbName}: ${result.rowCount} abonos actualizados`);
      }
    }
    
    console.log('\n❌ El problema es que no guardamos el nombre del vendedor del Excel...');
    console.log('Necesitamos reimportar con el matching correcto.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

reassignAbonos();
