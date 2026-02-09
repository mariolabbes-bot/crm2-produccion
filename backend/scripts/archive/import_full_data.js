require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const EXCEL_PATH = '/Users/mariolabbe/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Ventas/BASE VENTAS CRM2/BASE TABLAS CRM2.xlsx';

async function importClients() {
  console.log('📥 Importando clientes...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['BASE CLIENTES ACTIVOS'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  let imported = 0;
  for (const row of data) {
    try {
      // Buscar vendedor por nombre
      const vendedorResult = await pool.query(
        "SELECT id FROM users WHERE LOWER(nombre) = LOWER($1) AND rol IN ('vendedor', 'manager') LIMIT 1",
        [row.NombreVendedor || '']
      );
      const vendedor_id = vendedorResult.rows[0]?.id || null;

      await pool.query(`
        INSERT INTO clients (rut, nombre, email, telefono, direccion, ciudad, estado, pais, vendedor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (rut) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          email = EXCLUDED.email,
          telefono = EXCLUDED.telefono,
          direccion = EXCLUDED.direccion,
          ciudad = EXCLUDED.ciudad,
          estado = EXCLUDED.estado,
          vendedor_id = EXCLUDED.vendedor_id
      `, [
        row.Identificador || '',
        row.Nombre || '',
        row.Email || '',
        row.TelefonoPrincipal || '',
        (row.Direccion || '') + ' ' + (row.Numero || ''),
        row.Ciudad || row.Comuna || '',
        row.Sucursal || '',
        'Chile',
        vendedor_id
      ]);
      imported++;
      if (imported % 500 === 0) console.log(`   ${imported} clientes importados...`);
    } catch (err) {
      // Ignorar duplicados
    }
  }
  console.log(`✅ ${imported} clientes importados de ${data.length}`);
}

async function importSales() {
  console.log('📥 Importando ventas...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['VENTAS 2024-2025'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Agrupar ventas por folio (cada folio puede tener múltiples líneas de productos)
  const ventasPorFolio = {};
  for (const row of data) {
    const folio = row.Folio;
    if (!ventasPorFolio[folio]) {
      ventasPorFolio[folio] = {
        folio,
        fecha_emision: row['Fecha emisi√≥n'] || row['Fecha emision'] || '',
        rut: row.Identificador || '',
        cliente: row.Cliente || '',
        vendedor: row['Vendedor cliente'] || row['Vendedor documento'] || '',
        total: 0,
        items: []
      };
    }
    ventasPorFolio[folio].total += parseFloat(row['VALOR TOTAL'] || 0);
    ventasPorFolio[folio].items.push(row);
  }

  let imported = 0;
  for (const [folio, venta] of Object.entries(ventasPorFolio)) {
    try {
      // Buscar vendedor por nombre
      const vendedorResult = await pool.query(
        "SELECT id FROM users WHERE LOWER(nombre) = LOWER($1) AND rol IN ('vendedor', 'manager') LIMIT 1",
        [venta.vendedor]
      );
      const vendedor_id = vendedorResult.rows[0]?.id || null;

      // Convertir fecha (puede venir como número de Excel o string)
      let fecha = new Date();
      if (typeof venta.fecha_emision === 'number') {
        // Fecha de Excel (días desde 1900-01-01)
        fecha = new Date((venta.fecha_emision - 25569) * 86400 * 1000);
      } else if (venta.fecha_emision) {
        fecha = new Date(venta.fecha_emision);
      }

      await pool.query(`
        INSERT INTO sales (folio, fecha_emision, rut, cliente_nombre, vendedor_id, total_venta)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (folio) DO UPDATE SET
          total_venta = EXCLUDED.total_venta,
          vendedor_id = EXCLUDED.vendedor_id
      `, [
        folio,
        fecha,
        venta.rut,
        venta.cliente,
        vendedor_id,
        venta.total
      ]);
      imported++;
      if (imported % 1000 === 0) console.log(`   ${imported} ventas importadas...`);
    } catch (err) {
      console.error(`Error importando folio ${folio}:`, err.message);
    }
  }
  console.log(`✅ ${imported} ventas importadas de ${Object.keys(ventasPorFolio).length}`);
}

async function importAbonos() {
  console.log('📥 Importando abonos...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['ABONOS 2024-2025'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  let imported = 0;
  for (const row of data) {
    try {
      // Buscar vendedor por nombre
      const vendedorResult = await pool.query(
        "SELECT id FROM users WHERE LOWER(nombre) = LOWER($1) AND rol IN ('vendedor', 'manager') LIMIT 1",
        [row['Vendedor cliente'] || '']
      );
      const vendedor_id = vendedorResult.rows[0]?.id || null;

      // Convertir fecha
      let fecha = new Date();
      if (typeof row.Fecha === 'number') {
        fecha = new Date((row.Fecha - 25569) * 86400 * 1000);
      } else if (row.Fecha) {
        fecha = new Date(row.Fecha);
      }

      const monto = parseFloat(row.Monto || 0);
      if (monto <= 0) continue; // Ignorar abonos sin monto

      await pool.query(`
        INSERT INTO abono (folio, fecha_abono, monto, tipo_pago, cliente_nombre, vendedor_id, descripcion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (folio) DO UPDATE SET
          monto = EXCLUDED.monto,
          vendedor_id = EXCLUDED.vendedor_id
      `, [
        row.Folio || '',
        fecha,
        monto,
        row['Tipo pago'] || 'Sin especificar',
        row.Cliente || '',
        vendedor_id,
        row['Estado abono'] || ''
      ]);
      imported++;
      if (imported % 1000 === 0) console.log(`   ${imported} abonos importados...`);
    } catch (err) {
      // Ignorar duplicados
    }
  }
  console.log(`✅ ${imported} abonos importados de ${data.length}`);
}

async function main() {
  try {
    console.log('🚀 Iniciando importación completa...\n');
    
    await importClients();
    await importSales();
    await importAbonos();
    
    console.log('\n✨ Importación completa finalizada!');
    
    // Mostrar estadísticas
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM clients) as clientes,
        (SELECT COUNT(*) FROM sales) as ventas,
        (SELECT COUNT(*) FROM abono) as abonos
    `);
    console.log('\n📊 Estadísticas finales:');
    console.log(stats.rows[0]);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

main();
