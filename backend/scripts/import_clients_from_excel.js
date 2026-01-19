require('dotenv').config();
const XLSX = require('xlsx');
const pool = require('../src/db');
const fs = require('fs');
const path = require('path');

const BULK_DIR = path.join(__dirname, '../bulk_data');

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

async function importClients() {
  console.log('=== IMPORT CLIENTIES (MULTI-FILE BULK) ===');

  if (!fs.existsSync(BULK_DIR)) {
    console.error('No existe directorio bulk_data:', BULK_DIR);
    process.exit(1);
  }
  const allFiles = fs.readdirSync(BULK_DIR);
  // Look for files with 'CLIENTE' or 'BASE' (common for Base Tablas)
  const targetFiles = allFiles.filter(f => (f.toUpperCase().includes('CLIENTE') || f.toUpperCase().includes('BASE')) && !f.startsWith('PROCESSED_') && f.endsWith('.xlsx'));

  if (targetFiles.length === 0) {
    console.log('No se encontraron archivos de CLIENTES/BASE nuevos en:', BULK_DIR);
    process.exit(0);
  }
  console.log(`Archivos a procesar: ${targetFiles.length}`, targetFiles);

  const client = await pool.connect();

  try {

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

    // 2. Obtener el ID del manager para clientes sin vendedor asignado
    const managerResult = await client.query('SELECT id FROM users WHERE rol = \'manager\' LIMIT 1');
    const managerId = managerResult.rows[0]?.id || 1;

    let totalInserted = 0;

    for (const filename of targetFiles) {
      console.log(`\n📂 Leyendo archivo: ${filename}`);
      const filePath = path.join(BULK_DIR, filename);
      const workbook = XLSX.readFile(filePath);

      let sheetName = workbook.SheetNames.find(n => /CLIENTE|BASE/i.test(n));
      if (!sheetName) sheetName = workbook.SheetNames[0]; // Fallback

      console.log(`   Usando hoja: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      console.log(`   Filas en hoja: ${data.length}`);

      // Detect Columns
      // Expected: Identificador (Rut), Nombre, NombreVendedor, TelefonoPrincipal, Direccion, Numero, Ciudad, Comuna
      const headers = Object.keys(data[0] || {});
      // Helper to find key in object insensitive
      const findKey = (row, patterns) => {
        const keys = Object.keys(row);
        const k = keys.find(key => patterns.some(p => p.test(key)));
        return k ? row[k] : undefined;
      };

      // 3. Insertar clientes
      console.log('💾 Insertando clientes...');
      let insertedCount = 0;
      let skippedCount = 0;
      const errors = [];

      await client.query('BEGIN'); // Transaction per file

      for (const row of data) {
        try {
          const rutVal = findKey(row, [/^Identificador$/i, /^Rut$/i]);
          const rut = cleanRut(rutVal);
          if (!rut) {
            skippedCount++;
            continue;
          }

          // Buscar vendedor (Nombre string)
          const nombreVendVal = findKey(row, [/^Nombre.*Vendedor/i, /^Vendedor/i]);
          const vendedorName = normalizeVendedorName(nombreVendVal) || 'SIN VENDEDOR';

          const nombre = findKey(row, [/^Nombre$/i, /^Cliente$/i]) || 'Sin nombre';
          const fono = findKey(row, [/^Telefono/i, /^Celular/i]);
          const telefono = fono ? fono.toString() : null;
          const dir = findKey(row, [/^Direccion/i]) || '';
          const num = findKey(row, [/^Numero/i]) || '';
          const direccionCompleta = num ? `${dir} ${num}` : dir;
          const comuna = findKey(row, [/^Comuna/i, /^Ciudad/i]) || null;
          const ciudad = findKey(row, [/^Ciudad/i]) || comuna;

          // Insertar cliente
          // Schema: rut, nombre, email, telefono_principal, sucursal, categoria, subcategoria, comuna, ciudad, direccion, numero, nombre_vendedor
          await client.query(`
                INSERT INTO cliente (
                    rut, nombre, telefono_principal, direccion, ciudad, comuna, nombre_vendedor
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (rut) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    telefono_principal = EXCLUDED.telefono_principal,
                    direccion = EXCLUDED.direccion,
                    ciudad = EXCLUDED.ciudad,
                    comuna = EXCLUDED.comuna,
                    nombre_vendedor = EXCLUDED.nombre_vendedor
                `, [rut, nombre, telefono, direccionCompleta, ciudad, comuna, vendedorName]);

          insertedCount++;

        } catch (err) {
          errors.push({ rut: rutVal, motivo: err.message });
          skippedCount++;
        }
      }
      await client.query('COMMIT');
      console.log(`   ✅ Procesados este archivo: ${insertedCount}`);
      totalInserted += insertedCount;
    }

    console.log(`\n🎉 Proceso TOTAL completado: ${totalInserted} clientes insertados/actualizados.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la importación:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

importClients();
