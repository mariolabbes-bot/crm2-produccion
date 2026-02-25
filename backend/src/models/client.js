const pool = require('../db');

class ClientModel {
  static async findAll({ isManager, userId, vendedorIdFilter }) {
    let query = `
      SELECT c.*, u.nombre as vendedor_nombre 
      FROM cliente c 
      JOIN usuario u ON c.vendedor_id = u.id 
    `;
    const params = [];

    if (isManager) {
      // Si es manager, trae todo. 
      // Podríamos agregar filtro opcional por vendedor si se requiriera en el futuro
      query += ` ORDER BY c.id ASC`;
    } else {
      query += ` WHERE c.vendedor_id = $1 ORDER BY c.id ASC`;
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    // id es el RUT en la ruta /:id actual, aunque la columna PK es 'id' serial.
    // La ruta actual hace `WHERE rut = $1`. Mantengamos eso por compatibilidad.
    const result = await pool.query('SELECT * FROM cliente WHERE rut = $1', [id]);
    return result.rows[0];
  }

  static async findByRut(rut) {
    const result = await pool.query('SELECT * FROM cliente WHERE rut = $1', [rut]);
    return result.rows[0];
  }

  static async create(clientData) {
    const {
      rut, nombre, direccion, ciudad, estado, codigo_postal,
      pais, latitud, longitud, telefono, email, vendedor_id
    } = clientData;

    const query = `
      INSERT INTO cliente 
      (rut, nombre, direccion, ciudad, estado, codigo_postal, pais, latitud, longitud, telefono, email, vendedor_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *
    `;
    const values = [
      rut, nombre, direccion, ciudad, estado, codigo_postal,
      pais, latitud, longitud, telefono, email, vendedor_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async createBulk(clientsData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertedClients = [];

      for (const c of clientsData) {
        const { rut, nombre, direccion, telefono, email } = c;
        // Asume vendedor_id = userId (quien sube el archivo, o lógica similar)

        // UPSERT LOGIC
        const res = await client.query(
          `INSERT INTO cliente (rut, nombre, direccion, telefono, email, vendedor_id) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (rut) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             direccion = COALESCE(EXCLUDED.direccion, cliente.direccion),
             telefono = COALESCE(EXCLUDED.telefono, cliente.telefono),
             email = COALESCE(EXCLUDED.email, cliente.email)
           RETURNING *`,
          [rut, nombre, direccion, telefono, email, userId]
        );
        insertedClients.push(res.rows[0]);
      }

      await client.query('COMMIT');
      return insertedClients;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async findIncomplete() {
    // Definimos incompleto como: nombre es 'Unknown' O nombre es igual al Rut (si usamos rut como fallback)
    // O campos criticos nulos.
    // Usaremos la convención de Stubs: nombre = 'Unknown' O 'Cliente Nuevo'
    const query = `
      SELECT * FROM cliente 
      WHERE (nombre = 'Unknown' OR nombre IS NULL OR nombre = rut)
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, clientData, { isManager, userId }) {
    const { nombre, direccion, telefono, email } = clientData; // id aquí es el ID numérico de la tabla, según ruta PUT /:id

    let query = '';
    let params = [nombre, direccion, telefono, email, id];

    if (isManager) {
      query = `UPDATE cliente SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 RETURNING *`;
    } else {
      query = `UPDATE cliente SET nombre = $1, direccion = $2, telefono = $3, email = $4 WHERE id = $5 AND vendedor_id = $6 RETURNING *`;
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async delete(id, { isManager, userId }) {
    let query = '';
    let params = [id];

    if (isManager) {
      query = `DELETE FROM cliente WHERE id = $1 RETURNING *`;
    } else {
      query = `DELETE FROM cliente WHERE id = $1 AND vendedor_id = $2 RETURNING *`;
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // --- REPORTES Y CONSULTAS COMPLEJAS ---

  static async findInactivosMesActual({ hace12mStr, mesActualIni, mesActualFinStr, vendedorAlias }) {
    const params = [hace12mStr, mesActualIni, mesActualFinStr];
    let query = `
      WITH ventas_clientes AS (
        SELECT 
          c.rut, c.nombre, c.email, c.telefono, c.vendedor_alias,
          c.ciudad, c.comuna,
          COALESCE(SUM(v.valor_total), 0) as monto_total,
          COALESCE(AVG(v.valor_total), 0) as monto_promedio,
          COUNT(DISTINCT v.folio) as num_ventas,
          MODE() WITHIN GROUP (ORDER BY v.vendedor_id) as vendedor_id_principal,
          MIN(LOWER(v.vendedor_cliente)) as vendedor_cliente_lower
        FROM cliente c
        INNER JOIN venta v ON v.cliente = c.nombre
          AND v.fecha_emision >= $1 AND v.fecha_emision < $2
        WHERE NOT EXISTS (
          SELECT 1 FROM venta v2
          WHERE v2.cliente = c.nombre
            AND v2.fecha_emision >= $2 AND v2.fecha_emision <= $3
        )
        GROUP BY c.rut, c.nombre, c.email, c.telefono, c.vendedor_alias, c.ciudad, c.comuna
      )
      SELECT vc.*, u.nombre as vendedor_nombre
      FROM ventas_clientes vc
      LEFT JOIN usuario u ON u.id = vc.vendedor_id_principal
    `;

    if (vendedorAlias) {
      query += ` WHERE EXISTS (SELECT 1 FROM venta v WHERE v.cliente = vc.nombre AND LOWER(v.vendedor_cliente) = LOWER($4) AND v.fecha_emision >= $1 AND v.fecha_emision < $2)`;
      params.push(vendedorAlias);
    }

    query += ` ORDER BY monto_total DESC LIMIT 20`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findTopVentas({ nombreVendedor, isManager }) {
    // Si nombreVendedor viene, filtramos.
    let query = `
      SELECT 
        c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal AS telefono, c.email,
        COALESCE(SUM(CASE WHEN v.fecha_emision >= DATE_TRUNC('month', NOW()) THEN v.valor_total ELSE 0 END), 0) AS venta_mes_curso,
        COALESCE(SUM(CASE WHEN v.fecha_emision >= DATE_TRUNC('month', NOW() - INTERVAL '6 months') AND v.fecha_emision < DATE_TRUNC('month', NOW()) THEN v.valor_total ELSE 0 END) / 6.0, 0) AS venta_promedio_6m,
        COALESCE(SUM(v.valor_total), 0) AS total_ventas
      FROM cliente c
      INNER JOIN venta v ON UPPER(TRIM(c.nombre)) = UPPER(TRIM(v.cliente))
      WHERE v.fecha_emision >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
    `;

    const params = [];
    if (nombreVendedor) {
      query += ` AND UPPER(TRIM(v.vendedor_cliente)) = UPPER(TRIM($1))`;
      params.push(nombreVendedor);
    }

    query += `
      GROUP BY c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal, c.email
      ORDER BY total_ventas DESC
      LIMIT 20
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findFacturasImpagas({ nombreVendedor }) {
    let query = `
      SELECT 
        c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal as telefono, c.email, c.nombre_vendedor,
        COUNT(DISTINCT sc.folio) as cantidad_facturas_impagas,
        SUM(sc.total_factura) as monto_total_facturado,
        SUM(sc.saldo_factura) as monto_total_impago,
        COALESCE(SUM(sc.saldo_favor_disponible), 0) as saldo_favor_disponible,
        MIN(sc.fecha_emision) as factura_mas_antigua,
        EXTRACT(DAY FROM NOW() - MIN(sc.fecha_emision))::INTEGER as dias_mora
      FROM cliente c
      INNER JOIN saldo_credito sc ON c.rut = sc.rut
      WHERE sc.saldo_factura > 0
    `;

    const params = [];
    if (nombreVendedor) {
      query += ` AND UPPER(TRIM(c.nombre_vendedor)) = UPPER(TRIM($1))`;
      params.push(nombreVendedor);
    }

    query += `
      GROUP BY c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal, c.email, c.nombre_vendedor
      HAVING COUNT(DISTINCT sc.folio) > 0
      ORDER BY monto_total_impago DESC
      LIMIT 20
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async search({ term, nombreVendedor }) {
    // term tendrá %...% ya o se agrega aquí? Mejor que venga limpio y lo agregamos.
    // En la ruta actual viene de query q, y se le agregan %.

    const searchTerm = `%${term}%`;
    const params = [searchTerm, searchTerm];
    let query = `
      SELECT 
        c.rut, c.nombre, c.direccion, c.ciudad, c.telefono_principal as telefono, c.email,
        (
          SELECT COALESCE(SUM(v.valor_total), 0)
          FROM venta v
          WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM(c.nombre))
          AND v.fecha_emision >= NOW() - INTERVAL '12 months'
        ) as ventas_12m
      FROM cliente c
      WHERE (UPPER(c.nombre) LIKE UPPER($1) OR UPPER(c.rut) LIKE UPPER($2))
    `;

    if (nombreVendedor) {
      query += `
        AND EXISTS (
          SELECT 1 FROM venta v 
          WHERE UPPER(TRIM(v.cliente)) = UPPER(TRIM(c.nombre))
          AND (UPPER(v.vendedor_cliente) = UPPER($3) OR v.vendedor_cliente LIKE $3)
        )
      `;
      params.push(nombreVendedor);
    }

    query += `
      ORDER BY 
        CASE WHEN UPPER(c.nombre) LIKE UPPER($1) THEN 1 ELSE 2 END,
        ventas_12m DESC
      LIMIT 20
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async bulkAssignCircuit(ruts, circuito) {
    const query = `
      UPDATE cliente 
      SET circuito = $1 
      WHERE rut = ANY($2::varchar[])
      RETURNING rut, circuito
    `;
    const result = await pool.query(query, [circuito, ruts]);
    return result.rows;
  }
}

module.exports = ClientModel;
