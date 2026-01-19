
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

module.exports = router;
