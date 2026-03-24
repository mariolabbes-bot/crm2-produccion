
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /incomplete
// Returns products that need classification (stubbed) based on business logic
router.get('/incomplete', auth(), async (req, res) => {
    try {
        // Logic: Products where 'familia' is 'SIN CLASIFICAR' OR NULL
        const result = await pool.query(`
      SELECT sku, descripcion, marca, familia, subfamilia 
      FROM producto 
      WHERE familia = 'SIN CLASIFICAR' OR familia IS NULL OR marca = 'GENERICO' OR marca IS NULL
      ORDER BY sku ASC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /metadata
// Returns distinct existing Brands, Families, Subfamilies for dropdowns
router.get('/metadata', auth(), async (req, res) => {
    try {
        const brands = await pool.query("SELECT DISTINCT marca FROM producto WHERE marca IS NOT NULL AND marca != 'GENERICO' ORDER BY marca");
        const families = await pool.query("SELECT DISTINCT familia FROM producto WHERE familia IS NOT NULL AND familia != 'SIN CLASIFICAR' ORDER BY familia");
        const subfamilies = await pool.query("SELECT DISTINCT subfamilia FROM producto WHERE subfamilia IS NOT NULL AND subfamilia != 'SIN CLASIFICAR' ORDER BY subfamilia");

        res.json({
            marcas: brands.rows.map(r => r.marca),
            familias: families.rows.map(r => r.familia),
            subfamilias: subfamilies.rows.map(r => r.subfamilia)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /:sku
// Update product classification
router.put('/:sku', auth(), async (req, res) => {
    try {
        const { sku } = req.params;
        const { marca, familia, subfamilia } = req.body;

        const result = await pool.query(
            `UPDATE producto 
       SET marca = COALESCE($1, marca), 
           familia = COALESCE($2, familia), 
           subfamilia = COALESCE($3, subfamilia) 
       WHERE sku = $4 RETURNING *`,
            [marca, familia, subfamilia, sku]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /top-20
router.get('/top-20', auth(), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.sku, p.descripcion, p.marca, p.familia, 
                   SUM(v.cantidad) as total_vendido
            FROM producto p
            JOIN venta v ON p.sku = COALESCE(v.sku, '')
            GROUP BY p.sku, p.descripcion, p.marca, p.familia
            ORDER BY total_vendido DESC
            LIMIT 20
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error in /top-20:', err);
        res.status(500).json({ success: false, msg: 'Error al obtener top 20' });
    }
});

// GET /search
router.get('/search', auth(), async (req, res) => {
    try {
        const { q, marca, familia } = req.query;

        let query = `
            SELECT p.sku, p.descripcion, p.marca, p.familia, p.subfamilia, 
                   COALESCE(st.stock_total, 0) as stock_disponible, 
                   st.stock_desglose
            FROM producto p
            LEFT JOIN (
                SELECT sku, SUM(cantidad) as stock_total, jsonb_object_agg(sucursal, cantidad) as stock_desglose
                FROM stock WHERE cantidad > 0 GROUP BY sku
            ) st ON p.sku = st.sku
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        if (q && q.trim().length > 0) {
            query += ` AND (p.sku ILIKE $${paramIndex} OR p.descripcion ILIKE $${paramIndex})`;
            values.push(`%${q}%`);
            paramIndex++;
        }
        if (marca) {
            query += ` AND p.marca = $${paramIndex}`;
            values.push(marca);
            paramIndex++;
        }
        if (familia) {
            query += ` AND p.familia = $${paramIndex}`;
            values.push(familia);
            paramIndex++;
        }

        query += " ORDER BY p.descripcion LIMIT 50";

        if (values.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error in /search:', err);
        res.status(500).json({ success: false, msg: 'Error al buscar productos' });
    }
});

// GET /:sku/detail
router.get('/:sku/detail', auth(), async (req, res) => {
    try {
        const { sku } = req.params;

        // 1. Get stock from producto
        const pResult = await pool.query('SELECT stock_por_sucursal, descripcion, marca, familia FROM producto WHERE sku = $1', [sku]);
        if (pResult.rows.length === 0) {
            return res.status(404).json({ success: false, msg: 'Producto no encontrado' });
        }
        const product = pResult.rows[0];
        const stockObj = product.stock_por_sucursal || {};

        // 2. Get 6 months sales grouped by branch
        const vResult = await pool.query(`
            SELECT COALESCE(sucursal, 'Central') as sucursal, SUM(cantidad) as total_6m
            FROM venta
            WHERE sku = $1 AND fecha_emision >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY COALESCE(sucursal, 'Central')
            `, [sku]);

        const branchSales = vResult.rows;

        // 3. Merge stock and sales
        const allBranches = new Set([...Object.keys(stockObj), ...branchSales.map(s => s.sucursal)]);
        const combined = Array.from(allBranches).map(branch => {
            const sale = branchSales.find(s => s.sucursal === branch);
            const total6m = sale ? parseFloat(sale.total_6m) : 0;
            const avg6m = total6m / 6;

            return {
                sucursal: branch || 'Desconocida',
                venta_promedio: Number(avg6m.toFixed(2)),
                stock: stockObj[branch] || 0
            };
        });

        res.json({
            success: true,
            data: {
                sku,
                descripcion: product.descripcion,
                marca: product.marca,
                familia: product.familia,
                sucursales: combined.sort((a, b) => b.venta_promedio - a.venta_promedio)
            }
        });

    } catch (err) {
        console.error('Error in /:sku/detail:', err);
        res.status(500).json({ success: false, msg: 'Error al obtener detalle del producto' });
    }
});

module.exports = router;
