const pool = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ==================== UTILIDADES ====================

function norm(s) {
  return (s == null ? '' : String(s))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (m) {
      const dd = String(m[1]).padStart(2, '0');
      const mm = String(m[2]).padStart(2, '0');
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      const d = new Date(`${yyyy}-${mm}-${dd}`);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  return null;
}

function parseNumeric(value) {
  if (value == null || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// ==================== JOB MANAGEMENT ====================

async function createJob(tipo, filename, userRut) {
  const { v4: uuidv4 } = require('uuid');
  const jobId = uuidv4();
  await pool.query(
    `INSERT INTO import_job (job_id, tipo, filename, status, user_rut, created_at) 
     VALUES ($1, $2, $3, 'pending', $4, NOW())`,
    [jobId, tipo, filename, userRut]
  );
  console.log(`✅ Job creado: ${jobId} (${tipo})`);
  return jobId;
}

async function updateJobStatus(jobId, status, data = {}) {
  const updates = [];
  const values = [jobId];
  let paramCount = 2;

  updates.push(`status = $${paramCount++}`);
  values.push(status);

  if (status === 'processing') {
    updates.push(`started_at = NOW()`);
  }
  if (status === 'completed' || status === 'failed') {
    updates.push(`finished_at = NOW()`);
  }
  if (data.totalRows) {
    updates.push(`total_rows = $${paramCount++}`);
    values.push(data.totalRows);
  }
  if (data.importedRows !== undefined) {
    updates.push(`imported_rows = $${paramCount++}`);
    values.push(data.importedRows);
  }
  if (data.duplicateRows !== undefined) {
    updates.push(`duplicate_rows = $${paramCount++}`);
    values.push(data.duplicateRows);
  }
  if (data.errorRows !== undefined) {
    updates.push(`error_rows = $${paramCount++}`);
    values.push(data.errorRows);
  }
  if (data.resultData) {
    updates.push(`result_data = $${paramCount++}`);
    values.push(JSON.stringify(data.resultData));
  }
  if (data.errorMessage) {
    updates.push(`error_message = $${paramCount++}`);
    values.push(data.errorMessage);
  }
  if (data.reportFilename) {
    updates.push(`report_filename = $${paramCount++}`);
    values.push(data.reportFilename);
  }
  if (data.observationsFilename) {
    updates.push(`observations_filename = $${paramCount++}`);
    values.push(data.observationsFilename);
  }

  const sql = `UPDATE import_job SET ${updates.join(', ')} WHERE job_id = $1`;
  await pool.query(sql, values);
  console.log(`📊 Job ${jobId} → ${status}`);
}

async function getJobStatus(jobId) {
  const result = await pool.query('SELECT * FROM import_job WHERE job_id = $1', [jobId]);
  return result.rows[0] || null;
}

// ==================== ASYNC PROCESSING ====================

async function processVentasFileAsync(jobId, filePath, originalname) {
  const client = await pool.connect();
  
  try {
    console.log(`🔵 [Job ${jobId}] Iniciando procesamiento: ${originalname}`);
    await updateJobStatus(jobId, 'processing');

    // Leer Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

    console.log(`📊 [Job ${jobId}] Total filas en Excel: ${data.length}`);
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('El archivo Excel no contiene filas para procesar');
    }

    // Detectar columnas
    const headers = Object.keys(data[0] || {});
    const findCol = (patterns) => headers.find(h => patterns.some(p => p.test(h))) || null;
    
    const colFolio = findCol([/^Folio$/i]);
    const colTipoDoc = findCol([/^Tipo.*documento$/i, /^Tipo$/i]);
    const colFecha = findCol([/^Fecha$/i, /^Fecha.*emision$/i]);
    const colSucursal = findCol([/^Sucursal$/i]);
    const colIdentificador = findCol([/^Identificador$/i, /^RUT$/i]);
    const colCliente = findCol([/^Cliente$/i]);
    const colVendedorCliente = findCol([/^Vendedor.*cliente$/i, /^Alias.*vendedor$/i]);
    const colVendedorDoc = findCol([/^Vendedor.*documento$/i, /^Vendedor$/i]);
    const colEstadoSistema = findCol([/^Estado.*sistema$/i]);
    const colEstadoComercial = findCol([/^Estado.*comercial$/i]);
    const colEstadoSII = findCol([/^Estado.*SII$/i, /^Estado.*sii$/i]);
    const colIndice = findCol([/^Indice$/i, /^Index$/i]);
    const colSKU = findCol([/^SKU$/i, /^Codigo$/i]);
    const colDescripcion = findCol([/^Descripcion$/i, /^Descripción$/i]);
    const colCantidad = findCol([/^Cantidad$/i]);
    const colPrecio = findCol([/^Precio$/i]);
    const colValorTotal = findCol([/^Valor.*total$/i, /^Total$/i]);

    if (!colFolio || !colTipoDoc || !colFecha) {
      const faltantes = [
        !colFolio ? 'Folio' : null,
        !colTipoDoc ? 'Tipo documento' : null,
        !colFecha ? 'Fecha' : null
      ].filter(Boolean);
      throw new Error(`Faltan columnas requeridas: ${faltantes.join(', ')}`);
    }

    // Cargar usuarios existentes (usando nombre_vendedor para match)
    // Crear múltiples mapas para match flexible: completo, primera palabra, primeras dos palabras
    // Incluir a cualquier usuario que tenga nombre_vendedor definido, sin filtrar por rol
    const usersRes = await client.query("SELECT nombre_vendedor, nombre_completo FROM usuario WHERE nombre_vendedor IS NOT NULL");
    const usersByNormFull = new Map(); // Match por nombre completo
    const usersByFirstWord = new Map(); // Match por primera palabra
    const usersByFirstTwo = new Map(); // Match por primeras dos palabras
    
    usersRes.rows.filter(u => u.nombre_vendedor).forEach(u => {
      const nombreNorm = norm(u.nombre_vendedor);
      const palabras = nombreNorm.split(/\s+/);
      
      // Map completo
      usersByNormFull.set(nombreNorm, u.nombre_vendedor);
      
      // Map por primera palabra (ej: "Maiko" matchea "Maiko Ricardo Flores Maldonado")
      if (palabras.length > 0) {
        usersByFirstWord.set(palabras[0], u.nombre_vendedor);
      }
      
      // Map por primeras dos palabras (ej: "Matias Felipe" matchea "Matias Felipe Felipe Tapia Valenzuela")
      if (palabras.length >= 2) {
        usersByFirstTwo.set(`${palabras[0]} ${palabras[1]}`, u.nombre_vendedor);
      }
    });

    // Cargar clientes existentes
    const clientsRes = await client.query("SELECT rut, nombre FROM cliente");
    const clientsByRut = new Map(clientsRes.rows.filter(c => c.rut).map(c => [norm(c.rut), c.rut]));

    // Verificar duplicados existentes
    const existingSales = await client.query(
      "SELECT folio, tipo_documento FROM venta WHERE folio IS NOT NULL AND tipo_documento IS NOT NULL"
    );
    const existingKeys = new Set(
      existingSales.rows.map(s => `${norm(s.tipo_documento)}|${norm(s.folio)}`)
    );

    // Procesar filas
    const toImport = [];
    const duplicates = [];
    const missingVendors = new Set();
    const missingClients = new Set();
    const observations = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const excelRow = i + 2;
      const folio = row[colFolio] ? String(row[colFolio]).trim() : null;
      const tipoDoc = row[colTipoDoc] ? String(row[colTipoDoc]).trim() : null;
      const fecha = parseExcelDate(row[colFecha]);

      if (!folio || !tipoDoc || !fecha) continue;

      const key = `${norm(tipoDoc)}|${norm(folio)}`;
      if (existingKeys.has(key)) {
        duplicates.push({ folio, tipoDoc, fecha });
        continue;
      }

      const sucursal = colSucursal && row[colSucursal] ? String(row[colSucursal]).trim() : null;
      const identificador = colIdentificador && row[colIdentificador] ? String(row[colIdentificador]).trim() : null;
      const clienteNombre = colCliente && row[colCliente] ? String(row[colCliente]).trim() : null;
      const vendedorClienteAlias = colVendedorCliente && row[colVendedorCliente] ? String(row[colVendedorCliente]).trim() : null;
      const vendedorDocNombre = colVendedorDoc && row[colVendedorDoc] ? String(row[colVendedorDoc]).trim() : null;
      const estadoSistema = colEstadoSistema && row[colEstadoSistema] ? String(row[colEstadoSistema]).trim() : null;
      const estadoComercial = colEstadoComercial && row[colEstadoComercial] ? String(row[colEstadoComercial]).trim() : null;
      const estadoSII = colEstadoSII && row[colEstadoSII] ? String(row[colEstadoSII]).trim() : null;
      const indice = colIndice && row[colIndice] ? String(row[colIndice]).trim() : null;
      const sku = colSKU && row[colSKU] ? String(row[colSKU]).trim() : null;
      const descripcion = colDescripcion && row[colDescripcion] ? String(row[colDescripcion]).trim() : null;
      const cantidad = colCantidad ? parseNumeric(row[colCantidad]) : null;
      const precio = colPrecio ? parseNumeric(row[colPrecio]) : null;
      const valorTotal = colValorTotal ? parseNumeric(row[colValorTotal]) : null;

      let vendedorAlias = null;
      if (vendedorClienteAlias) {
        const vendedorNorm = norm(vendedorClienteAlias);
        const palabras = vendedorNorm.split(/\s+/);
        
        // Intentar match en orden: completo → dos palabras → una palabra
        let found = null;
        
        // 1. Match exacto (ej: "Eduardo Enrique Ponce Castillo")
        if (usersByNormFull.has(vendedorNorm)) {
          found = usersByNormFull.get(vendedorNorm);
        }
        // 2. Match por primeras dos palabras (ej: "Matias Felipe" → "Matias Felipe Felipe Tapia Valenzuela")
        else if (palabras.length >= 2) {
          const dosPalabras = `${palabras[0]} ${palabras[1]}`;
          if (usersByFirstTwo.has(dosPalabras)) {
            found = usersByFirstTwo.get(dosPalabras);
          }
        }
        // 3. Match por primera palabra (ej: "Maiko" → "Maiko Ricardo Flores Maldonado")
        if (!found && palabras.length > 0) {
          if (usersByFirstWord.has(palabras[0])) {
            found = usersByFirstWord.get(palabras[0]);
          }
        }
        
        if (found) {
          vendedorAlias = found;
        } else {
          missingVendors.add(vendedorClienteAlias);
          observations.push({ fila: excelRow, folio, campo: 'vendedor_cliente', detalle: `Vendedor no encontrado: ${vendedorClienteAlias}` });
        }
      }

      let clienteRut = null;
      if (identificador && /^\d{7,8}-[\dkK]$/.test(identificador)) {
        const existe = clientsByRut.has(norm(identificador));
        if (existe) {
          clienteRut = identificador;
        }
      }
      if (!clienteRut && (clienteNombre || identificador)) {
        missingClients.add(clienteNombre || identificador);
        observations.push({ fila: excelRow, folio, campo: 'identificador', detalle: `Cliente no encontrado: ${clienteNombre || identificador}` });
      }

      toImport.push({
        sucursal, tipoDoc, folio, fecha,
        identificador: clienteRut,
        clienteNombre,
        vendedorClienteAlias: vendedorAlias,
        vendedorDocNombre,
        estadoSistema, estadoComercial, estadoSII, indice,
        sku, descripcion, cantidad, precio, valorTotal
      });
    }

    // Generar informe de faltantes
    let pendingReportPath = null;
    if (missingVendors.size > 0 || missingClients.size > 0) {
      const reportWB = XLSX.utils.book_new();
      
      if (missingVendors.size > 0) {
        const vendorData = Array.from(missingVendors).map(v => ({
          'Nombre o Alias Vendedor': v,
          'Email': '',
          'Rol': 'vendedor'
        }));
        const vendorWS = XLSX.utils.json_to_sheet(vendorData);
        XLSX.utils.book_append_sheet(reportWB, vendorWS, 'Vendedores Faltantes');
      }

      if (missingClients.size > 0) {
        const clientData = Array.from(missingClients).map(c => {
          const rutRegex = /^\d{7,8}-[\dkK]$/;
          return rutRegex.test(c)
            ? { 'RUT': c, 'Nombre': '', 'Email': '', 'Teléfono': '' }
            : { 'RUT': '', 'Nombre': c, 'Email': '', 'Teléfono': '' };
        });
        const clientWS = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(reportWB, clientWS, 'Clientes Faltantes');
      }

      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      pendingReportPath = path.join(reportDir, `faltantes_${jobId}.xlsx`);
      XLSX.writeFile(reportWB, pendingReportPath);
    }

    let importedCount = 0;
    let observationsReportPath = null;

    if (toImport.length > 0) {
      console.log(`✅ [Job ${jobId}] Iniciando importación de ${toImport.length} ventas...`);
      
      // Pre-cargar productos con litros
      let productoMap = new Map();
      try {
        const productosRes = await client.query('SELECT sku, litros_por_unidad FROM producto WHERE litros_por_unidad IS NOT NULL');
        productosRes.rows.forEach(p => {
          productoMap.set(p.sku ? p.sku.toUpperCase().trim() : '', parseFloat(p.litros_por_unidad) || 0);
        });
        console.log(`📦 [Job ${jobId}] ${productoMap.size} productos cargados para cálculo de litros`);
      } catch (prodError) {
        console.warn(`⚠️ [Job ${jobId}] No se pudieron cargar productos:`, prodError.message);
      }
      
      // OPTIMIZACIÓN: Insertar en LOTES (batch inserts) en lugar de uno por uno
      const BATCH_SIZE = 500; // 500 registros por query
      
      for (let batchStart = 0; batchStart < toImport.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, toImport.length);
        const batch = toImport.slice(batchStart, batchEnd);
        
        try {
          // Construir VALUES clause para múltiples registros
          let placeholders = [];
          let params = [];
          let paramIndex = 1;
          
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            let litrosVendidos = 0;
            if (item.sku && item.cantidad) {
              const skuKey = item.sku.toUpperCase().trim();
              const litrosPorUnidad = productoMap.get(skuKey);
              if (litrosPorUnidad && litrosPorUnidad > 0) {
                litrosVendidos = item.cantidad * litrosPorUnidad;
              }
            }
            
            // Agregar 18 placeholders para este registro
            placeholders.push(
              `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
              `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
              `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
              `$${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
            );
            
            // Agregar parámetros
            params.push(
              item.sucursal, item.tipoDoc, item.folio, item.fecha, item.identificador,
              item.clienteNombre, item.vendedorClienteAlias, null,
              item.estadoSistema, item.estadoComercial, item.estadoSII, item.indice,
              item.sku, item.descripcion, item.cantidad, item.precio, item.valorTotal, litrosVendidos
            );
          }
          
          // Ejecutar INSERT único con todos los registros del lote
          if (placeholders.length > 0) {
            const query = `
              INSERT INTO venta (
                sucursal, tipo_documento, folio, fecha_emision, identificador,
                cliente, vendedor_cliente, vendedor_documento,
                estado_sistema, estado_comercial, estado_sii, indice,
                sku, descripcion, cantidad, precio, valor_total, litros_vendidos
              ) VALUES ${placeholders.join(', ')}
            `;
            
            const result = await client.query(query, params);
            importedCount += result.rowCount;
            
            // Log de progreso cada lote
            console.log(`📊 [Job ${jobId}] Progreso: ${importedCount}/${toImport.length}`);
          }
          
        } catch (err) {
          console.error(`❌ [Job ${jobId}] Error en lote ${Math.floor(batchStart / BATCH_SIZE) + 1}:`, err.message);
          // Registrar error pero continuar con el siguiente lote
          observations.push({ fila: `Lote ${batchStart}-${batchEnd}`, folio: null, campo: 'DB', detalle: err.detail || err.message });
        }
      }
      
      console.log(`✅ [Job ${jobId}] Importación finalizada: ${importedCount} ventas guardadas`);
    }

    // Generar informe de observaciones
    if (observations.length > 0) {
      const wbObs = XLSX.utils.book_new();
      const wsObs = XLSX.utils.json_to_sheet(observations.map(o => ({
        'Fila Excel': o.fila,
        'Folio': o.folio,
        'Campo': o.campo,
        'Detalle': o.detalle
      })));
      XLSX.utils.book_append_sheet(wbObs, wsObs, 'Observaciones');
      const reportDir = 'uploads/reports';
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      observationsReportPath = path.join(reportDir, `observaciones_ventas_${jobId}.xlsx`);
      XLSX.writeFile(wbObs, observationsReportPath);
    }

    // Resultado final
    const result = {
      success: true,
      totalRows: data.length,
      toImport: toImport.length,
      imported: importedCount,
      duplicates: duplicates.length,
      duplicatesList: duplicates.slice(0, 10),
      missingVendors: Array.from(missingVendors),
      missingClients: Array.from(missingClients),
      pendingReportUrl: pendingReportPath ? `/api/import/download-report/${path.basename(pendingReportPath)}` : null,
      observationsReportUrl: observationsReportPath ? `/api/import/download-report/${path.basename(observationsReportPath)}` : null,
      dataImported: importedCount > 0
    };

    // Actualizar job como completado
    await updateJobStatus(jobId, 'completed', {
      totalRows: data.length,
      importedRows: importedCount,
      duplicateRows: duplicates.length,
      errorRows: observations.length,
      resultData: result,
      reportFilename: pendingReportPath ? path.basename(pendingReportPath) : null,
      observationsFilename: observationsReportPath ? path.basename(observationsReportPath) : null
    });

    // Limpiar archivo temporal
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log(`✅ [Job ${jobId}] Procesamiento completado exitosamente`);
    return result;

  } catch (error) {
    console.error(`❌ [Job ${jobId}] Error en procesamiento:`, error);
    await updateJobStatus(jobId, 'failed', {
      errorMessage: error.message
    });
    
    // Limpiar archivo temporal
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createJob,
  updateJobStatus,
  getJobStatus,
  processVentasFileAsync
};
