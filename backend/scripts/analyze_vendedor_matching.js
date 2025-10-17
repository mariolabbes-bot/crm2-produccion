require('dotenv').config();
const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

const excelPath = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

// Función para normalizar nombre de vendedor
function normalizeVendedorName(name) {
  if (!name) return null;
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
}

async function analyzeVendedorMatching() {
  const client = await pool.connect();
  
  try {
    console.log('📂 Leyendo archivo Excel...\n');
    const workbook = XLSX.readFile(excelPath, { cellDates: true });
    const sheetName = 'ABONOS 2024-2025';
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Obtener vendedores únicos del Excel
    const vendedoresExcel = new Map();
    data.forEach(row => {
      const vendedor = row['Vendedor cliente'];
      if (vendedor) {
        const normalized = normalizeVendedorName(vendedor);
        if (!vendedoresExcel.has(normalized)) {
          vendedoresExcel.set(normalized, {
            original: vendedor,
            normalized: normalized,
            count: 0,
            monto: 0
          });
        }
        vendedoresExcel.get(normalized).count++;
        vendedoresExcel.get(normalized).monto += parseFloat(row['Monto']) || 0;
      }
    });
    
    console.log('👥 Vendedores encontrados en Excel (ABONOS 2024-2025):\n');
    const vendedoresArray = Array.from(vendedoresExcel.values())
      .sort((a, b) => b.monto - a.monto);
    
    vendedoresArray.forEach((v, index) => {
      console.log(`${index + 1}. "${v.original}"`);
      console.log(`   └─ Normalizado: "${v.normalized}"`);
      console.log(`   └─ Abonos: ${v.count}`);
      console.log(`   └─ Monto total: $${v.monto.toLocaleString()}\n`);
    });
    
    // Obtener vendedores de la base de datos
    console.log('\n📊 Vendedores en la base de datos:\n');
    const vendedoresDB = await client.query(`
      SELECT id, nombre, rol 
      FROM users 
      WHERE rol IN ('vendedor', 'manager')
      ORDER BY nombre
    `);
    
    vendedoresDB.rows.forEach((v, index) => {
      const normalized = normalizeVendedorName(v.nombre);
      console.log(`${index + 1}. "${v.nombre}" (${v.rol})`);
      console.log(`   └─ Normalizado: "${normalized}"`);
      console.log(`   └─ ID: ${v.id}\n`);
    });
    
    // Hacer el matching
    console.log('\n🔗 Análisis de matching:\n');
    const vendedoresDBMap = new Map();
    vendedoresDB.rows.forEach(v => {
      const normalized = normalizeVendedorName(v.nombre);
      vendedoresDBMap.set(normalized, v);
    });
    
    let matched = 0;
    let notMatched = 0;
    const notMatchedList = [];
    
    vendedoresArray.forEach(v => {
      if (vendedoresDBMap.has(v.normalized)) {
        matched++;
        const dbVendedor = vendedoresDBMap.get(v.normalized);
        console.log(`✅ MATCH: "${v.original}" → "${dbVendedor.nombre}" (${v.count} abonos, $${v.monto.toLocaleString()})`);
      } else {
        notMatched++;
        notMatchedList.push(v);
        console.log(`❌ NO MATCH: "${v.original}" (${v.count} abonos, $${v.monto.toLocaleString()})`);
      }
    });
    
    console.log('\n\n📈 Resumen del matching:');
    console.log(`   ✅ Vendedores con match: ${matched}`);
    console.log(`   ❌ Vendedores sin match: ${notMatched}`);
    console.log(`   📊 Total vendedores únicos en Excel: ${vendedoresArray.length}`);
    console.log(`   📊 Total vendedores en DB: ${vendedoresDB.rows.length}`);
    
    if (notMatchedList.length > 0) {
      console.log('\n\n⚠️  Vendedores sin match (sugerencias):');
      notMatchedList.forEach(v => {
        console.log(`\n"${v.original}" (${v.count} abonos, $${v.monto.toLocaleString()})`);
        
        // Buscar similitudes
        const suggestions = [];
        vendedoresDB.rows.forEach(dbV => {
          const similarity = calculateSimilarity(v.normalized, normalizeVendedorName(dbV.nombre));
          if (similarity > 0.5) {
            suggestions.push({ nombre: dbV.nombre, similarity });
          }
        });
        
        if (suggestions.length > 0) {
          suggestions.sort((a, b) => b.similarity - a.similarity);
          console.log('   Posibles matches:');
          suggestions.forEach(s => {
            console.log(`   → "${s.nombre}" (${(s.similarity * 100).toFixed(1)}% similar)`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Función simple de similitud basada en caracteres comunes
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Contar caracteres comunes
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }
  
  return matches / longer.length;
}

analyzeVendedorMatching();
