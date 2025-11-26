const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const axios = require('axios');

console.log('🔥🔥🔥 CARGANDO ROUTES/CLIENTS.JS - VERSIÓN 2.0.1 - COUNT(*) FIX 🔥🔥🔥');
console.log('🕐 Timestamp de carga: 1763750166');

// DEBUG: listar rutas registradas en este router
router.get('/debug/routes', (req, res) => {
  const stack = router.stack
    .filter(l => l.route && l.route.path)
    .map(l => ({ method: Object.keys(l.route.methods)[0], path: l.route.path }));
  res.json({ registered: stack });
});

// DEBUG: columnas reales de tabla venta
router.get('/debug/venta-columns', async (req, res) => {
  try {
    const q = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'venta' ORDER BY ordinal_position`;
    const r = await pool.query(q);
    res.json({ columns: r.rows });
  } catch (e) {
    console.error('❌ /debug/venta-columns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: ejecutar query mínima para top ventas
router.get('/debug/top-query', async (req, res) => {
  try {
    const q = `SELECT UPPER(TRIM(c.nombre)) as nombre, c.rut, COUNT(*) as ventas, SUM(v.valor_total) as total
               FROM cliente c INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
               WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
               GROUP BY c.rut, c.nombre
               ORDER BY total DESC
               LIMIT 5`;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (e) {
    console.error('❌ /debug/top-query error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET top 20 clientes con mayor venta en últimos 12 meses pero sin ventas en el mes actual
router.get('/inactivos-mes-actual', auth(), async (req, res) => {
  try {
    // Detectar tabla y columnas de ventas
    const ventasTable = 'venta';
    const clienteCol = 'cliente';
    const fechaCol = 'fecha_emision';
    const vendedorCol = 'vendedor_id';
    const valorCol = 'valor_total';
    // Fechas
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const mesActualIni = `${year}-${String(month).padStart(2, '0')}-01`;
    const mesActualFin = new Date(year, month, 0); // último día del mes actual
    const mesActualFinStr = `${year}-${String(month).padStart(2, '0')}-${String(mesActualFin.getDate()).padStart(2, '0')}`;
    const hace12m = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const hace12mStr = `${hace12m.getFullYear()}-${String(hace12m.getMonth() + 1).padStart(2, '0')}-01`;

    // Query: top 20 clientes con mayor venta en últimos 12 meses, sin ventas en mes actual
    // Incluir monto total y promedio de ventas
    const params = [hace12mStr, mesActualIni, mesActualFinStr];
    let vendedorAlias = null;
    // Si es vendedor (no manager), filtrar por su alias automáticamente
    if (req.user.rol !== 'manager') {
      const userResult = await pool.query('SELECT alias FROM usuario WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0 && userResult.rows[0].alias) {
        vendedorAlias = userResult.rows[0].alias;
      }
    } else if (req.query && req.query.vendedor_id) {
      // Si es manager y envía vendedor_id, filtrar por ese vendedor
      const vendedorId = parseInt(req.query.vendedor_id, 10);
      if (!Number.isNaN(vendedorId)) {
        const vRes = await pool.query('SELECT alias FROM usuario WHERE id = $1', [vendedorId]);
        if (vRes.rows.length === 0 || !vRes.rows[0].alias) {
          return res.status(400).json({ msg: 'vendedor_id inválido' });
        }
        vendedorAlias = vRes.rows[0].alias;
      }
    }
    
    const query = `
      WITH ventas_clientes AS (
        SELECT 
          c.rut, 
          c.nombre, 
          c.email, 
          c.telefono, 
          c.vendedor_alias,
          c.ciudad, 
          c.comuna,
          COALESCE(SUM(v.${valorCol}), 0) as monto_total,
          COALESCE(AVG(v.${valorCol}), 0) as monto_promedio,
          COUNT(DISTINCT v.folio) as num_ventas,
          MODE() WITHIN GROUP (ORDER BY v.${vendedorCol}) as vendedor_id_principal,
          MIN(LOWER(v.vendedor_cliente)) as vendedor_cliente_lower
        FROM cliente c
        INNER JOIN ${ventasTable} v ON v.${clienteCol} = c.nombre
          AND v.${fechaCol} >= $1 AND v.${fechaCol} < $2
        WHERE NOT EXISTS (
          SELECT 1 FROM ${ventasTable} v2
          WHERE v2.${clienteCol} = c.nombre
            AND v2.${fechaCol} >= $2 AND v2.${fechaCol} <= $3
        )
        GROUP BY c.rut, c.nombre, c.email, c.telefono, c.vendedor_alias, c.ciudad, c.comuna
      )
      SELECT 
        vc.*,
        u.nombre as vendedor_nombre
      FROM ventas_clientes vc
      LEFT JOIN usuario u ON u.id = vc.vendedor_id_principal
      ${vendedorAlias ? 'WHERE EXISTS (SELECT 1 FROM venta v WHERE v.cliente = vc.nombre AND LOWER(v.vendedor_cliente) = LOWER($4) AND v.fecha_emision >= $1 AND v.fecha_emision < $2)' : ''}
      ORDER BY monto_total DESC
      LIMIT 20
    `;
    if (vendedorAlias) params.push(vendedorAlias);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET clients (all for manager, own for vendedor)
router.get('/', auth(), async (req, res) => {
  try {
    let result;
    if (req.user.rol === 'manager') {
      result = await pool.query('SELECT c.*, u.nombre as vendedor_nombre FROM cliente c JOIN usuario u ON c.vendedor_id = u.id ORDER BY c.id ASC');
    } else {
      result = await pool.query('SELECT c.*, u.nombre as vendedor_nombre FROM cliente c JOIN usuario u ON c.vendedor_id = u.id WHERE c.vendedor_id = $1 ORDER BY c.id ASC', [req.user.id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// NOTA: Ruta /:id movida al final del archivo para evitar que capture rutas específicas como /top-ventas-v2

// CREATE a new client with geocoding
router.post('/', auth(), async (req, res) => {
  try {
    const { rut, nombre, direccion, ciudad, estado, codigo_postal, pais, telefono, email, vendedor_id } = req.body;
    let latitud = null;
    let longitud = null;

    const fullAddress = `${direccion}, ${ciudad}, ${estado}, ${codigo_postal}, ${pais}`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey && direccion) {
      try {
        const geoResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: fullAddress,
            key: apiKey
          }
        });
        if (geoResponse.data.status === 'OK') {
          const location = geoResponse.data.results[0].geometry.location;
          latitud = location.lat;
          longitud = location.lng;
        }
      } catch (geoErr) {
        console.error('Geocoding failed:', geoErr.message);
        // Non-blocking error, we still save the client
      }
    }

    // Si el usuario es manager y se envía vendedor_id, usarlo. Si no, usar el id del usuario autenticado.
    let vendedorIdToUse = req.user.rol === 'manager' && vendedor_id ? vendedor_id : req.user.id;

    const newClient = await pool.query(
      'INSERT INTO cliente (rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, vendedor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, vendedorIdToUse]
    );
    res.status(201).json(newClient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// BULK CREATE new clients (Geocoding not implemented for bulk)
router.post('/bulk', auth(), async (req, res) => {
  const clients = req.body;

  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({ msg: 'Please provide a list of clients.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertedClients = [];
    for (const c of clients) {
      // Note: Geocoding is skipped for bulk inserts to avoid hitting API limits quickly.
      // You might want to implement a batch geocoding strategy or a queue system for this.
      const { rut, nombre, direccion, telefono, email } = c;
      const newClient = await client.query(
        'INSERT INTO cliente (rut, nombre, direccion, telefono, email, vendedor_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [rut, nombre, direccion, telefono, email, req.user.id]
      );
      insertedClients.push(newClient.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(insertedClients);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// UPDATE a client
router.put('/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    // Note: Geocoding on update is not implemented yet.
    const { nombre, direccion, telefono, email } = req.body;
    
    let updatedClient;
    if (req.user.rol === 'manager') {
        updatedClient = await pool.query(
            'UPDATE cliente SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 RETURNING *',
            [nombre, direccion, telefono, email, id]
        );
    } else {
        updatedClient = await pool.query(
            'UPDATE cliente SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 AND vendedor_id = $6 RETURNING *',
            [nombre, direccion, telefono, email, id, req.user.id]
        );
    }

    if (updatedClient.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(updatedClient.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE a client
router.delete('/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    let deleteOp;
    if (req.user.rol === 'manager') {
        deleteOp = await pool.query('DELETE FROM cliente WHERE id = $1 RETURNING *', [id]);
    } else {
        deleteOp = await pool.query('DELETE FROM cliente WHERE id = $1 AND vendedor_id = $2 RETURNING *', [id, req.user.id]);
    }

    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json({ msg: 'Client deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// INTERCEPTOR - Log antes de definir la ruta
console.log('🟢 Definiendo ruta GET /top-ventas-v2');

// GET /api/clients/top-ventas-v2 - Top 20 clientes con más ventas
router.get('/top-ventas-v2', (req, res, next) => {
  console.log('🎯 PRE-AUTH: Petición recibida en /top-ventas-v2');
  next();
}, auth(), async (req, res) => {
  console.log('🎯🎯🎯 ENDPOINT /top-ventas-v2 POST-AUTH INICIADO 🎯🎯🎯');
  try {
    console.log('📊 [TOP-VENTAS v2.2] Obteniendo top 20 clientes por ventas...');
    console.log('👤 Usuario:', JSON.stringify(req.user, null, 2));

    const user = req.user;
    const isManager = user.rol?.toLowerCase() === 'manager';
    console.log('🔑 Es manager:', isManager);

    // Simplificado: Manager ve todos, vendedor necesita filtro manual
    let vendedorFilter = '';
    let params = [];

    // Si es vendedor Y tiene nombre_vendedor en el token, filtrar
    if (!isManager && user.nombre_vendedor) {
      vendedorFilter = 'AND UPPER(v.vendedor_cliente) = UPPER($1)';
      params.push(user.nombre_vendedor);
      console.log('🧪 Filtro vendedor aplicado para:', user.nombre_vendedor);
    } else if (req.query.vendedor_id) {
      // Manager filtrando por vendedor específico
      try {
        const vendedorQuery = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [req.query.vendedor_id]);
        if (vendedorQuery.rows.length > 0 && vendedorQuery.rows[0].nombre_vendedor) {
          vendedorFilter = 'AND UPPER(v.vendedor_cliente) = UPPER($1)';
          params.push(vendedorQuery.rows[0].nombre_vendedor);
          console.log('🧪 Filtro vendedor aplicado por query:', vendedorQuery.rows[0].nombre_vendedor);
        }
      } catch (eVend) {
        console.warn('⚠️ Error buscando vendedor por rut:', eVend.message);
      }
    }

    const query = `
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.ciudad,
        c.telefono_principal AS telefono,
        c.email,
        COALESCE(SUM(v.valor_total), 0) AS total_ventas,
        COUNT(*) AS cantidad_ventas,
        COUNT(*) AS ventas,
        COALESCE(SUM(v.valor_total), 0) AS total
      FROM cliente c
      INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
      WHERE v.fecha_emision >= NOW() - INTERVAL '12 months'
      ${vendedorFilter}
      GROUP BY c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal, c.email
      ORDER BY total_ventas DESC
      LIMIT 20
    `;

    console.log('📊 Query a ejecutar (top-ventas-v2):', query);
    console.log('📊 Params:', params);
    console.log('📊 Longitud params:', params.length);
    
    // DEBUG: Si es vendedor, mostrar cuántas ventas tiene en total
    if (!isManager && user.nombre_vendedor) {
      const debugQuery = await pool.query(
        `SELECT COUNT(*) as total_ventas_vendedor 
         FROM venta v 
         WHERE UPPER(v.vendedor_cliente) = UPPER($1) 
         AND v.fecha_emision >= NOW() - INTERVAL '12 months'`,
        [user.nombre_vendedor]
      );
      console.log('🔍 DEBUG Vendedor - Total ventas en DB:', debugQuery.rows[0]);
    }
    
    const result = await pool.query(query, params);
    console.log(`📊 Top clientes obtenidos: ${result.rows.length}`);
    if (result.rows.length) {
      console.log('📌 Primer registro ejemplo:', result.rows[0]);
    } else if (!isManager) {
      console.log('⚠️ VENDEDOR SIN RESULTADOS - Verificar coincidencia de nombres');
    }

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error obteniendo top clientes:', err.message);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({
      msg: 'Error al obtener top clientes',
      error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message
    });
  }
});

// GET /api/clients/facturas-impagas - Clientes con ventas recientes pero facturas impagas >30 días
router.get('/facturas-impagas', auth(), async (req, res) => {
  console.log('🎯🎯🎯 ENDPOINT /facturas-impagas INICIADO 🎯🎯🎯');
  try {
    console.log('⚠️  [FACTURAS-IMPAGAS v2.0] Obteniendo clientes con facturas impagas...');
    console.log('👤 Usuario:', JSON.stringify(req.user, null, 2));
    
    const user = req.user;
    const isManager = user.rol?.toLowerCase() === 'manager';
    
    // Construir filtro de vendedor
    let vendedorFilter = '';
    let params = [];
    
    if (!isManager) {
      const nombreVendedor = user.nombre_vendedor || user.alias || '';
      if (nombreVendedor) {
        vendedorFilter = 'AND UPPER(v.vendedor_cliente) = UPPER($1)';
        params.push(nombreVendedor);
      }
    } else if (req.query.vendedor_id) {
      const vendedorRut = req.query.vendedor_id;
      const vendedorQuery = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [vendedorRut]);
      if (vendedorQuery.rows.length > 0) {
        vendedorFilter = 'AND UPPER(v.vendedor_cliente) = UPPER($1)';
        params.push(vendedorQuery.rows[0].nombre_vendedor);
      }
    }
    
    // Query simplificado: clientes con ventas recientes y facturas antiguas sin pago completo
    const query = `
      WITH ventas_recientes AS (
        SELECT DISTINCT v.cliente
        FROM venta v
        WHERE v.fecha_emision >= NOW() - INTERVAL '3 months'
        ${vendedorFilter}
      ),
      facturas_antiguas AS (
        SELECT 
          v.cliente,
          COUNT(*) as cantidad_facturas_impagas,
          SUM(v.valor_total) as monto_total_facturado,
          MIN(v.fecha_emision) as factura_mas_antigua
        FROM venta v
        WHERE v.fecha_emision <= NOW() - INTERVAL '30 days'
        ${vendedorFilter}
        GROUP BY v.cliente
      ),
      abonos_por_cliente AS (
        SELECT 
          UPPER(TRIM(a.cliente)) as cliente_normalizado,
          SUM(COALESCE(a.monto, a.monto_abono, 0)) as total_abonado
        FROM abono a
        GROUP BY UPPER(TRIM(a.cliente))
      )
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.ciudad,
        c.telefono_principal as telefono,
        c.email,
        fa.cantidad_facturas_impagas,
        fa.monto_total_facturado,
        COALESCE(ab.total_abonado, 0) as total_abonado,
        (fa.monto_total_facturado - COALESCE(ab.total_abonado, 0)) as monto_total_impago,
        fa.factura_mas_antigua,
        EXTRACT(DAY FROM NOW() - fa.factura_mas_antigua)::INTEGER as dias_mora
      FROM cliente c
      INNER JOIN ventas_recientes vr ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(vr.cliente))
      INNER JOIN facturas_antiguas fa ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(fa.cliente))
      LEFT JOIN abonos_por_cliente ab ON UPPER(TRIM(c.nombre)) = ab.cliente_normalizado
      WHERE (fa.monto_total_facturado - COALESCE(ab.total_abonado, 0)) > 0
      ORDER BY monto_total_impago DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, params);
    console.log(`⚠️  Clientes con facturas impagas: ${result.rows.length} encontrados`);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error obteniendo clientes con facturas impagas:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Error al obtener clientes con facturas impagas', 
      error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message 
    });
  }
});

// GET /api/clients/search - Buscar clientes por nombre o RUT
router.get('/search', auth(), async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }
    
    console.log(`🔍 [GET /clients/search] Buscando: "${q}"`);
    
    const user = req.user;
    const isManager = user.rol?.toLowerCase() === 'manager';
    
    // Construir filtro más flexible - buscar en cualquier parte del nombre o RUT
    const searchTerm = `%${q.trim()}%`;
    
    let vendedorFilter = '';
    let params = [searchTerm, searchTerm];
    
    if (!isManager) {
      // Vendedor solo ve sus propios clientes (con ventas asociadas)
      const nombreVendedor = user.nombre_vendedor || user.alias || '';
      if (nombreVendedor) {
        vendedorFilter = `
          AND EXISTS (
            SELECT 1 FROM venta v 
            WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM(c.nombre))
            AND (
              UPPER(v.vendedor_cliente) = UPPER($3)
              OR v.vendedor_cliente LIKE $3
            )
          )
        `;
        params.push(nombreVendedor);
      }
    } else if (req.query.vendedor_id) {
      // Manager filtrando por vendedor específico
      const vendedorRut = req.query.vendedor_id;
      const vendedorQuery = await pool.query('SELECT nombre_vendedor FROM usuario WHERE rut = $1', [vendedorRut]);
      if (vendedorQuery.rows.length > 0) {
        vendedorFilter = `
          AND EXISTS (
            SELECT 1 FROM venta v 
            WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM(c.nombre))
            AND (
              UPPER(v.vendedor_cliente) = UPPER($3)
              OR v.vendedor_cliente LIKE $3
            )
          )
        `;
        params.push(vendedorQuery.rows[0].nombre_vendedor);
      }
    }
    
    const query = `
      SELECT 
        c.rut,
        c.nombre,
        c.direccion,
        c.ciudad,
        c.telefono_principal as telefono,
        c.email,
        (
          SELECT COALESCE(SUM(v.valor_total), 0)
          FROM venta v
          WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM(c.nombre))
          AND v.fecha_emision >= NOW() - INTERVAL '12 months'
        ) as ventas_12m
      FROM cliente c
      WHERE (
        UPPER(c.nombre) LIKE UPPER($1)
        OR UPPER(c.rut) LIKE UPPER($2)
      )
      ${vendedorFilter}
      ORDER BY 
        CASE 
          WHEN UPPER(c.nombre) LIKE UPPER($1) THEN 1
          ELSE 2
        END,
        ventas_12m DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query, params);
    console.log(`🔍 Búsqueda "${q}": ${result.rows.length} clientes encontrados`);
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error en búsqueda de clientes:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Error al buscar clientes', 
      error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message 
    });
  }
});

// GET a single client by ID - RUTA DINÁMICA AL FINAL para no capturar rutas específicas
router.get('/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    let result;
    if (req.user.rol === 'manager') {
      result = await pool.query('SELECT * FROM cliente WHERE rut = $1', [id]);
    } else {
      // Vendedor: buscar cliente por rut Y verificar que le pertenece (via nombre_vendedor)
      result = await pool.query('SELECT * FROM cliente WHERE rut = $1', [id]);
      if (result.rows.length > 0) {
        // Verificar que el vendedor del cliente coincide con el usuario
        if (result.rows[0].nombre_vendedor !== req.user.nombre_vendedor && 
            result.rows[0].nombre_vendedor !== req.user.alias) {
          return res.status(403).json({ msg: 'Access denied' });
        }
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;