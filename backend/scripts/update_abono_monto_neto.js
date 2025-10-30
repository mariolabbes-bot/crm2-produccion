const XLSX = require('xlsx');
const pool = require('../src/db');

async function updateAbonoMontoNeto() {
  try {
    console.log('🔄 Actualizando columnas MONTO y MONTO_NETO con valores reales del Excel...\n');
    
    // Leer archivo Excel
    const workbook = XLSX.readFile('../db/modelo_importacion_crm2.xlsx');
    const abonosSheet = workbook.Sheets['ABONOS'];
    const abonosData = XLSX.utils.sheet_to_json(abonosSheet);
    
    console.log(`📊 Total de registros en Excel: ${abonosData.length}`);
    
    // Preparar actualizaciones por lote
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const batchSize = 1000;
    
    for (let i = 0; i < abonosData.length; i += batchSize) {
      const batch = abonosData.slice(i, i + batchSize);
      
      // Construir query para actualización por lote
      for (const row of batch) {
        try {
          const folio = row.Folio || row.folio || row[' Folio '];
          const monto = row[' Monto '] || row['Monto'] || row['monto'];
          const montoNeto = row[' Monto Neto '] || row['Monto Neto'] || row['monto_neto'];
          
          if (!folio) {
            console.log(`⚠️  Saltando fila sin folio`);
            errors++;
            continue;
          }
          
          if (monto === undefined || monto === null) {
            console.log(`⚠️  Saltando folio ${folio} sin monto`);
            errors++;
            continue;
          }
          
          // Actualizar registro con monto y monto_neto
          const result = await pool.query(
            `UPDATE abono SET monto = $1, monto_neto = $2 WHERE folio = $3`,
            [monto, montoNeto, folio.toString()]
          );
          
          if (result.rowCount > 0) {
            updated++;
          } else {
            notFound++;
            if (notFound <= 5) {
              console.log(`⚠️  No se encontró abono con folio: ${folio}`);
            }
          }
        } catch (err) {
          errors++;
          console.error(`❌ Error actualizando folio ${row.Folio}:`, err.message);
        }
      }
      
      // Mostrar progreso
      const progress = Math.min(i + batchSize, abonosData.length);
      const pct = ((progress / abonosData.length) * 100).toFixed(1);
      console.log(`📝 Procesados: ${progress}/${abonosData.length} (${pct}%)`);
    }
    
    console.log('\n✅ Actualización completada:');
    console.log(`   Actualizados: ${updated}`);
    console.log(`   No encontrados: ${notFound}`);
    console.log(`   Errores: ${errors}`);
    
    // Verificar totales
    const totals = await pool.query(`
      SELECT 
        SUM(monto_total) as total_monto_total,
        SUM(monto) as total_monto,
        SUM(monto_neto) as total_monto_neto,
        COUNT(*) as cantidad,
        COUNT(monto) as cantidad_con_monto
      FROM abono
    `);
    
    const totalMontoTotal = parseFloat(totals.rows[0].total_monto_total || 0);
    const totalMonto = parseFloat(totals.rows[0].total_monto || 0);
    const totalMontoNeto = parseFloat(totals.rows[0].total_monto_neto || 0);
    const ratio = totalMonto > 0 ? (totalMontoNeto / totalMonto).toFixed(4) : 0;
    
    console.log('\n📊 NUEVOS TOTALES EN BASE DE DATOS:');
    console.log(`   Total MONTO_TOTAL: $${totalMontoTotal.toLocaleString()}`);
    console.log(`   Total MONTO: $${totalMonto.toLocaleString()}`);
    console.log(`   Total MONTO_NETO: $${totalMontoNeto.toLocaleString()}`);
    console.log(`   Ratio MONTO_NETO/MONTO: ${ratio} (esperado: ~0.8403 = 1/1.19)`);
    console.log(`   Registros: ${totals.rows[0].cantidad}`);
    console.log(`   Registros con MONTO: ${totals.rows[0].cantidad_con_monto}`);
    
    // Comparar con totales esperados del Excel
    const expectedMonto = 13478889923;
    const expectedMontoNeto = 11326798254.622;
    const diffMonto = Math.abs(totalMonto - expectedMonto);
    const diffMontoNeto = Math.abs(totalMontoNeto - expectedMontoNeto);
    const diffPctMonto = totalMonto > 0 ? (diffMonto / expectedMonto * 100).toFixed(2) : 100;
    const diffPctMontoNeto = totalMontoNeto > 0 ? (diffMontoNeto / expectedMontoNeto * 100).toFixed(2) : 100;
    
    console.log('\n🔍 VERIFICACIÓN vs EXCEL:');
    console.log(`   MONTO esperado: $${expectedMonto.toLocaleString()}`);
    console.log(`   MONTO real: $${totalMonto.toLocaleString()}`);
    console.log(`   Diferencia: $${diffMonto.toLocaleString()} (${diffPctMonto}%)`);
    console.log(`   MONTO_NETO esperado: $${expectedMontoNeto.toLocaleString()}`);
    console.log(`   MONTO_NETO real: $${totalMontoNeto.toLocaleString()}`);
    console.log(`   Diferencia: $${diffMontoNeto.toLocaleString()} (${diffPctMontoNeto}%)`);
    
    if (diffPctMonto < 0.01 && diffPctMontoNeto < 0.01) {
      console.log('\n   ✅ Los totales coinciden perfectamente con el Excel!');
    } else if (diffPctMonto < 1 && diffPctMontoNeto < 1) {
      console.log('\n   ⚠️  Pequeña diferencia (aceptable)');
    } else {
      console.log('\n   ❌ Diferencia significativa - revisar datos');
    }
    
    await pool.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

updateAbonoMontoNeto();
