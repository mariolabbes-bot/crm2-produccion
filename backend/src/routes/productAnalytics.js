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
        const now = new Date();
        const currentMonth = getMonthRange(now);
        const lastYearDate = new Date(now);
        lastYearDate.setFullYear(now.getFullYear() - 1);
        const lastYearMonth = getMonthRange(lastYearDate);

        console.log(`📊 [ProductAnalytics] KPIs Request (Master Table).`);

        const getKpiData = async (label, valueExpression, whereClause) => {
            const query = `
                SELECT 
                    'Current' as period,
                    SUM(${valueExpression}) as total
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2
                  AND ${whereClause}
                
                UNION ALL
                
                SELECT 
                    'LastYear' as period,
                    SUM(${valueExpression}) as total
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                WHERE v.fecha_emision BETWEEN $3 AND $4
                  AND ${whereClause}
            `;

            const result = await pool.query(query, [currentMonth.start, currentMonth.end, lastYearMonth.start, lastYearMonth.end]);
            const current = parseFloat(result.rows.find(r => r.period === 'Current')?.total || 0);
            const lastYear = parseFloat(result.rows.find(r => r.period === 'LastYear')?.total || 0);

            let variation = 0;
            if (lastYear > 0) variation = ((current - lastYear) / lastYear) * 100;
            else if (current > 0) variation = 100;

            return {
                label,
                current: Math.round(current),
                lastYear: Math.round(lastYear),
                variation: parseFloat(variation.toFixed(1))
            };
        };

        // 1. LUBRICANTES (Litros reales desde Maestro)
        const kpiLubricantes = await getKpiData(
            'Litros Lubricantes',
            'v.cantidad * cp.litros',
            "UPPER(cp.familia) LIKE '%LUBRICANTE%'"
        );

        // 2. TBR (General, no solo Aplus, según verificador)
        // Subfamilia incluye 'Neumaticos TBR'
        const kpiTbrAplus = await getKpiData(
            'Unidades TBR',
            'v.cantidad',
            "UPPER(cp.subfamilia) LIKE '%TBR%'"
        );

        // 3. PCR (General, no solo Aplus)
        // Subfamilia incluye 'Neumaticos PCR'
        const kpiPcrAplus = await getKpiData(
            'Unidades PCR',
            'v.cantidad',
            "UPPER(cp.subfamilia) LIKE '%PCR%'"
        );

        // 4. REENCAUCHE (Unidades)
        // Familia incluye 'REENCAUCHE'
        const kpiReencauche = await getKpiData(
            'Unidades Reencauche',
            'v.cantidad',
            "UPPER(cp.familia) LIKE '%REENCAUCHE%'"
        );

        res.json({
            success: true,
            period: { current: currentMonth, lastYear: lastYearMonth },
            kpis: [
                { ...kpiLubricantes, id: 'lubricantes', unit: 'Lts' },
                { ...kpiTbrAplus, id: 'tbr_aplus', unit: 'Un' },
                { ...kpiPcrAplus, id: 'pcr_aplus', unit: 'Un' },
                { ...kpiReencauche, id: 'reencauche', unit: 'Un' }
            ]
        });

    } catch (error) {
        console.error('❌ Error KPIs:', error);
        res.status(500).json({ success: false, msg: 'Error calculando KPIs' });
    }
});

module.exports = router;
