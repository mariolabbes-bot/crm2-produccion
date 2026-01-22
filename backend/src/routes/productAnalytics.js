const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Helper para obtener rango de fechas
const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Último día del mes
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

        console.log(`📊 [ProductAnalytics] KPIs Request. Current: ${currentMonth.start} to ${currentMonth.end} | LastYear: ${lastYearMonth.start} to ${lastYearMonth.end}`);

        // Función reutilizable para queries compararativas
        const getKpiData = async (label, valueConfig, whereClause) => {
            const query = `
                SELECT 
                    'Current' as period,
                    SUM(${valueConfig}) as total
                FROM venta v
                LEFT JOIN producto p ON v.sku = p.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2
                  AND ${whereClause}
                
                UNION ALL
                
                SELECT 
                    'LastYear' as period,
                    SUM(${valueConfig}) as total
                FROM venta v
                LEFT JOIN producto p ON v.sku = p.sku
                WHERE v.fecha_emision BETWEEN $3 AND $4
                  AND ${whereClause}
            `;

            const result = await pool.query(query, [currentMonth.start, currentMonth.end, lastYearMonth.start, lastYearMonth.end]);

            const current = parseFloat(result.rows.find(r => r.period === 'Current')?.total || 0);
            const lastYear = parseFloat(result.rows.find(r => r.period === 'LastYear')?.total || 0);

            let variation = 0;
            if (lastYear > 0) {
                variation = ((current - lastYear) / lastYear) * 100;
            } else if (current > 0) {
                variation = 100; // Crecimiento infinito si antes era 0
            }

            return {
                label,
                current: Math.round(current), // Redondear para visualización limpia
                lastYear: Math.round(lastYear),
                variation: parseFloat(variation.toFixed(1))
            };
        };

        // 1. LUBRICANTES (Fallback a Cantidad si litros es 0, o idealmente v.litros_vendidos si estuviara poblado)
        // Como descubrimos que LITROS es nulo, reportaremos Unidades por ahora para que se muevan las agujas.
        const kpiLubricantes = await getKpiData(
            'Lubricantes (Unid.)',
            'v.cantidad',
            "UPPER(p.familia) = 'LUBRICANTES'"
        );

        // 2. TBR APLUS (Unidades) - Fix: LIKE
        const kpiTbrAplus = await getKpiData(
            'Unidades TBR Aplus',
            'v.cantidad',
            "UPPER(p.subfamilia) LIKE '%TBR%' AND UPPER(p.marca) = 'APLUS'"
        );

        // 3. PCR APLUS (Unidades) - Fix: LIKE
        const kpiPcrAplus = await getKpiData(
            'Unidades PCR Aplus',
            'v.cantidad',
            "UPPER(p.subfamilia) LIKE '%PCR%' AND UPPER(p.marca) = 'APLUS'"
        );

        // 4. REENCAUCHE (Unidades)
        const kpiReencauche = await getKpiData(
            'Unidades Reencauche',
            'v.cantidad',
            "UPPER(p.familia) = 'REENCAUCHE'"
        );

        res.json({
            success: true,
            period: {
                current: currentMonth,
                lastYear: lastYearMonth
            },
            kpis: [
                { ...kpiLubricantes, id: 'lubricantes', unit: 'Un' }, // Cambiado a Un
                { ...kpiTbrAplus, id: 'tbr_aplus', unit: 'Un' },
                { ...kpiPcrAplus, id: 'pcr_aplus', unit: 'Un' },
                { ...kpiReencauche, id: 'reencauche', unit: 'Un' }
            ]
        });

    } catch (error) {
        console.error('❌ Error en /api/product-analytics/kpis:', error);
        res.status(500).json({ success: false, msg: 'Error calculando KPIs de productos' });
    }
});

module.exports = router;
