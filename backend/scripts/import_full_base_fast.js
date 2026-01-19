require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const fs = require('fs');
const { from: copyFrom } = require('pg-copy-streams');
const path = require('path');

const BULK_DIR = path.join(__dirname, '../bulk_data');
const NEON_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_DYTSqK9GI8Ei@ep-rapid-sky-ace1kx9r-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });

function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'number' && !isNaN(value)) {
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const v = value.trim();
    // Try common formats
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.split('T')[0];
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, '0');
      const mm = String(m[2]).padStart(2, '0');
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

async function importData() {
  console.log('=== IMPORT VENTAS (MULTI-FILE BULK) ===');

  if (!fs.existsSync(BULK_DIR)) {
    console.error('No existe directorio bulk_data:', BULK_DIR);
    process.exit(1);
  }
  const allFiles = fs.readdirSync(BULK_DIR);
  const targetFiles = allFiles.filter(f => f.toUpperCase().includes('VENTA') && !f.startsWith('PROCESSED_') && f.endsWith('.xlsx'));

  if (targetFiles.length === 0) {
    console.log('No se encontraron archivos VENTAS nuevos en:', BULK_DIR);
    process.exit(0);
  }
  console.log(`Archivos a procesar: ${targetFiles.length}`, targetFiles);

  const client = await pool.connect();

  try {
    // --- PRE-IMPORT: Ensure Vendors Exist ---
    console.log('Verificando vendedores (ALIAS) existentes...');
    // FK references usuario(alias), so we must check ALIASES.
    const existingAliasesRes = await client.query('SELECT alias FROM usuario WHERE alias IS NOT NULL');
    const aliasMap = new Map(); // Lowercase -> RealAlias
    existingAliasesRes.rows.forEach(u => {
      const a = u.alias.trim();
      aliasMap.set(a.toLowerCase(), a);
    });

    const newAliases = new Set(); // Lowercase -> OriginalAlias (for stub creation)

    // Scan files
    for (const filename of targetFiles) {
      const filePath = path.join(BULK_DIR, filename);
      const wb = XLSX.readFile(filePath);
      let sheetName = wb.SheetNames.find(n => /venta|detalle/i.test(n));
      if (!sheetName) sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: true });

      const headers = Object.keys(rows[0] || {});
      const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
      const colVendedorDoc = findCol([/^Vendedor.*doc/i, /^Vendedor$/i]);

      if (colVendedorDoc) {
        for (const r of rows) {
          const v = (r[colVendedorDoc] || '').toString().trim();
          // We treat this value 'v' as the ALIAS because that's what we insert into 'vendedor_documento'
          if (v) {
            const lowerKey = v.toLowerCase();
            if (!aliasMap.has(lowerKey)) {
              newAliases.add(v);
            }
          }
        }
      }
    }

    if (newAliases.size > 0) {
      console.log(`Creando ${newAliases.size} ALIAS faltantes (stubs)...`);
      for (const originalAlias of newAliases) {
        try {
          const dummyRut = `STUB-${Math.floor(Math.random() * 100000000)}-${Date.now()}`;
          // Insert with ALIAS
          await client.query(`
                    INSERT INTO usuario (rut, nombre_completo, nombre_vendedor, rol_usuario, password, alias)
                    VALUES ($1, $2, $2, 'VENDEDOR', '123456', $2)
                    ON CONFLICT (rut) DO NOTHING
                 `, [dummyRut.slice(0, 12), originalAlias]);

          aliasMap.set(originalAlias.toLowerCase(), originalAlias);
        } catch (err) {
          console.warn(`Could not create stub for alias ${originalAlias}: ${err.message}`);
        }
      }
    }

    console.log('Limpiando tabla venta...');
    await client.query('DELETE FROM venta');

    const csvPath = '/tmp/ventas_import.csv';
    const out = fs.createWriteStream(csvPath);
    let totalCount = 0;

    for (const filename of targetFiles) {
      console.log(`\n📄 Leyendo: ${filename}`);
      const filePath = path.join(BULK_DIR, filename);
      const wb = XLSX.readFile(filePath);

      // Try to find a sheet with 'venta' or 'detalle' or fallback to first
      let sheetName = wb.SheetNames.find(n => /venta|detalle/i.test(n));
      if (!sheetName) sheetName = wb.SheetNames[0];

      console.log(`   Usando hoja: ${sheetName}`);
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: true });
      console.log(`   Filas: ${rows.length}`);

      // Detect Columns
      const headers = Object.keys(rows[0] || {});
      const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;

      const colFolio = findCol([/^Folio$/i]);
      const colFecha = findCol([/^Fecha/i]);
      const colIdentificador = findCol([/^Identificador$/i, /^Rut/i]);
      const colCliente = findCol([/^Cliente$/i]);
      const colVendedorDoc = findCol([/^Vendedor.*doc/i, /^Vendedor$/i]); // Priority to document vendor
      const colVendedorCli = findCol([/^Vendedor.*cli/i]);
      const colTipoDoc = findCol([/^Tipo.*doc/i]);
      const colCantidad = findCol([/^Cantidad$/i]);
      const colPrecio = findCol([/^Precio/i]);
      const colTotal = findCol([/^Valor.*total/i, /^Total/i]);
      const colSucursal = findCol([/^Sucursal/i]);
      const colSku = findCol([/^SKU/i, /^Codigo/i]);
      const colDescripcion = findCol([/^Descripc/i]);

      if (!colFolio || !colFecha || !colCliente) {
        console.error(`   ❌ Columnas críticas faltantes en ${filename}`);
        continue;
      }
      const sanitize = (val) => (val || '').toString().replace(/[\r\n\t]+/g, ' ').trim();
      const toCopyVal = (val) => val === '' ? '\\N' : val;

      for (const r of rows) {
        const fecha = parseExcelDate(r[colFecha]);
        if (!fecha) continue;

        const folio = sanitize(r[colFolio]);
        const identificador = colIdentificador && r[colIdentificador] ? sanitize(r[colIdentificador]) : '';
        const cliente = sanitize(r[colCliente]);

        // Vendors - Resolve using Map (Aliases)
        let vendDocRaw = colVendedorDoc && r[colVendedorDoc] ? sanitize(r[colVendedorDoc]) : '';
        let vendDoc = vendDocRaw;
        // Case-insensitive lookup to get the Real Alias from DB
        if (vendDocRaw && aliasMap.has(vendDocRaw.toLowerCase())) {
          vendDoc = aliasMap.get(vendDocRaw.toLowerCase());
        }

        const vendCli = colVendedorCli && r[colVendedorCli] ? sanitize(r[colVendedorCli]) : '';

        const tipoDoc = colTipoDoc && r[colTipoDoc] ? sanitize(r[colTipoDoc]) : '';
        const sucursal = colSucursal && r[colSucursal] ? sanitize(r[colSucursal]) : '';
        const sku = colSku && r[colSku] ? sanitize(r[colSku]) : '';
        const descripcion = colDescripcion && r[colDescripcion] ? sanitize(r[colDescripcion]) : '';

        const cant = parseFloat(r[colCantidad]) || 0;
        const precio = parseFloat(r[colPrecio]) || 0;
        let totalVal = 0;
        if (colTotal && r[colTotal]) {
          totalVal = parseFloat(r[colTotal]) || 0;
        } else {
          totalVal = cant * precio;
        }

        const litros = 0; // Logic for liters can be added if needed, or calculated in DB/triggers

        // CSV Order: folio, fecha_emision, identificador, cliente, vendedor_documento, vendedor_cliente, tipo_documento, cantidad, precio, valor_total, sucursal, sku, descripcion
        // TABLE columns in COPY must match this order
        out.write(`${toCopyVal(folio)}\t${fecha}\t${toCopyVal(identificador)}\t${toCopyVal(cliente)}\t${toCopyVal(vendDoc)}\t${toCopyVal(vendCli)}\t${toCopyVal(tipoDoc)}\t${cant}\t${precio}\t${totalVal}\t${toCopyVal(sucursal)}\t${toCopyVal(sku)}\t${toCopyVal(descripcion)}\n`);
        totalCount++;
      }
    }

    out.end();
    await new Promise(res => out.on('finish', res));
    console.log(`\n✅ CSV generado: ${totalCount} registros`);

    if (totalCount > 0) {
      console.log('Iniciando COPY a tabla venta...');
      const stream = client.query(copyFrom(`
                COPY venta (
                    folio, fecha_emision, identificador, cliente, 
                    vendedor_documento, vendedor_cliente, tipo_documento, 
                    cantidad, precio, valor_total, sucursal, sku, descripcion
                ) 
                FROM STDIN WITH (FORMAT text, DELIMITER E'\\t')
            `));
      const fileStream = fs.createReadStream(csvPath);
      await new Promise((resolve, reject) => {
        fileStream.on('error', reject);
        stream.on('error', reject);
        stream.on('finish', resolve);
        fileStream.pipe(stream);
      });
      console.log('✅ Importación de VENTAS finalizada.');
    }

    const check = await client.query('SELECT COUNT(*) as c, SUM(valor_total) as t FROM venta');
    console.log('📊 Estado Final Venta:', check.rows[0]);

    fs.unlinkSync(csvPath);

  } catch (e) {
    console.error('Error importando ventas:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importData();
