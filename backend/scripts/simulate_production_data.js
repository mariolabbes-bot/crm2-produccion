/**
 * SCRIPT PARA SIMULAR VOLUMEN DE DATOS DE PRODUCCIÓN
 * Propósito: Generar registros masivos en 'venta' y 'abono' para estresar el sistema localmente.
 */
const pool = require('../src/db');

async function simulateData() {
  console.log('🏗️ Iniciando simulación de datos masivos...');
  
  try {
    // 1. Obtener algunos RUTs válidos de la tabla cliente
    const clientsRes = await pool.query('SELECT rut FROM cliente LIMIT 100');
    if (clientsRes.rowCount === 0) {
      console.log('❌ No hay clientes en la base de datos. Por favor, ejecuta el seed o importación básica primero.');
      return;
    }
    const ruts = clientsRes.rows.map(r => r.rut);

    console.log(`📡 Usando ${ruts.length} clientes como base.`);

    // 2. Generar 10,000 ventas adicionales
    const numVentas = 10000;
    console.log(`📝 Generando ${numVentas} ventas...`);
    
    for (let i = 0; i < 10; i++) { // 10 lotes de 1000
        const values = [];
        for (let j = 0; j < 1000; j++) {
            const rut = ruts[Math.floor(Math.random() * ruts.length)];
            const monto = Math.floor(Math.random() * 100000);
            const fecha = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            values.push(`('Factura', 'SIM-${i}-${j}', '${fecha}', '${rut}', ${monto}, 'UNIDAD', 1, ${monto})`);
        }

        const query = `
            INSERT INTO venta (tipo_documento, folio, fecha_emision, identificador, valor_total, descripcion, cantidad, precio)
            VALUES ${values.join(',')}
            ON CONFLICT (folio) DO NOTHING
        `;
        await pool.query(query);
        console.log(`✅ Lote ${i + 1}/10 de ventas insertado.`);
    }

    console.log('🎉 Simulación completada con éxito.');

  } catch (err) {
    console.error('💥 Error durante la simulación:', err);
  } finally {
    await pool.end();
  }
}

simulateData();
