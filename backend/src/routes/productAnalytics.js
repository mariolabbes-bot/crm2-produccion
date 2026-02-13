const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
};

router.get('/kpis', auth(), async (req, res) => {
    try {
        const { vendedor_id } = req.query;
        const isManager = req.user.rol.toUpperCase() === 'MANAGER';
        let targetRut = vendedor_id || (isManager ? null : req.user.rut);

        const now = new Date();
        const currentMonth = getMonthRange(now);
        const lastYearDate = new Date(now);
        lastYearDate.setFullYear(now.getFullYear() - 1);
        const lastYearMonth = getMonthRange(lastYearDate);

        console.log(`📊 [ProductAnalytics] KPIs Request (Target RUT: ${targetRut || 'ALL'}).`);

        let dynamicWhere = '';
        let vendorJoin = '';
        let queryParams = [currentMonth.start, currentMonth.end, lastYearMonth.start, lastYearMonth.end];

        // Optimización: Consulta única consolidada
        // Definimos las condiciones SQL para cada métrica
        const metrics = [
            { id: 'lubricantes', label: 'Litros Lubricantes', unit: 'Lts', val: 'v.cantidad * cp.litros', cond: "UPPER(cp.familia) LIKE '%LUBRICANTE%'" },
            { id: 'tbr_aplus', label: 'Unidades TBR', unit: 'Un', val: 'v.cantidad', cond: "UPPER(cp.subfamilia) LIKE '%TBR%'" }, // TBR General
            { id: 'pcr_aplus', label: 'Unidades PCR', unit: 'Un', val: 'v.cantidad', cond: "UPPER(cp.subfamilia) LIKE '%PCR%'" }, // PCR General
            { id: 'reencauche', label: 'Unidades Reencauche', unit: 'Un', val: 'v.cantidad', cond: "UPPER(cp.familia) LIKE '%REENCAUCHE%'" }
        ];

        // Construir partes del SELECT dinámicamente
        const selectParts = [];
        metrics.forEach(m => {
            selectParts.push(`SUM(CASE WHEN (v.fecha_emision BETWEEN $1 AND $2) AND (${m.cond}) THEN ${m.val} ELSE 0 END) as "${m.id}_current"`);
            selectParts.push(`SUM(CASE WHEN (v.fecha_emision BETWEEN $3 AND $4) AND (${m.cond}) THEN ${m.val} ELSE 0 END) as "${m.id}_lastyear"`);
        });

        if (targetRut) {
            queryParams.push(targetRut);
            vendorJoin = `
                LEFT JOIN usuario u_filt ON UPPER(TRIM(u_filt.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
                LEFT JOIN usuario u2_filt ON UPPER(TRIM(u2_filt.alias)) = UPPER(TRIM(v.vendedor_documento))
            `;
            dynamicWhere = `AND COALESCE(u_filt.rut, u2_filt.rut) = $${queryParams.length}`;
        }

        const bigQuery = `
            SELECT 
                ${selectParts.join(',\n                ')}
            FROM venta v
            JOIN clasificacion_productos cp ON v.sku = cp.sku
            ${vendorJoin}
            WHERE (v.fecha_emision BETWEEN $1 AND $2 OR v.fecha_emision BETWEEN $3 AND $4)
              ${dynamicWhere}
        `;

        const result = await pool.query(bigQuery, queryParams);
        const row = result.rows[0] || {};

        const kpis = metrics.map(m => {
            const current = parseFloat(row[`${m.id}_current`] || 0);
            const lastYear = parseFloat(row[`${m.id}_lastyear`] || 0);

            let variation = 0;
            if (lastYear > 0) variation = ((current - lastYear) / lastYear) * 100;
            else if (current > 0) variation = 100;

            return {
                id: m.id,
                label: m.label,
                unit: m.unit,
                current: Math.round(current),
                lastYear: Math.round(lastYear),
                variation: parseFloat(variation.toFixed(1))
            };
        });

        res.json({
            success: true,
            period: { current: currentMonth, lastYear: lastYearMonth },
            kpis: kpis
        });

    } catch (error) {
        console.error('❌ Error KPIs:', error);
        res.status(500).json({ success: false, msg: 'Error calculando KPIs' });
    }
});

module.exports = router;
