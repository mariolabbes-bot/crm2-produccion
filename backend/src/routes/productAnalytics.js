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

        if (targetRut) {
            queryParams.push(targetRut);
            vendorJoin = `
                LEFT JOIN usuario u_filt ON UPPER(TRIM(u_filt.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
                LEFT JOIN usuario u2_filt ON UPPER(TRIM(u2_filt.alias)) = UPPER(TRIM(v.vendedor_documento))
            `;
            dynamicWhere = `AND COALESCE(u_filt.rut, u2_filt.rut) = $${queryParams.length}`;
        }

        const getKpiData = async (label, valueExpression, whereClause) => {
            const query = `
                SELECT 
                    'Current' as period,
                    SUM(${valueExpression}) as total
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                ${vendorJoin}
                WHERE v.fecha_emision BETWEEN $1 AND $2
                  AND ${whereClause}
                  ${dynamicWhere}
                
                UNION ALL
                
                SELECT 
                    'LastYear' as period,
                    SUM(${valueExpression}) as total
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                ${vendorJoin}
                WHERE v.fecha_emision BETWEEN $3 AND $4
                  AND ${whereClause}
                  ${dynamicWhere}
            `;

            const result = await pool.query(query, queryParams);
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

        // 2. TBR (General, no solo Aplus)
        const kpiTbrAplus = await getKpiData(
            'Unidades TBR',
            'v.cantidad',
            "UPPER(cp.subfamilia) LIKE '%TBR%'"
        );

        // 3. PCR (General, no solo Aplus)
        const kpiPcrAplus = await getKpiData(
            'Unidades PCR',
            'v.cantidad',
            "UPPER(cp.subfamilia) LIKE '%PCR%'"
        );

        // 4. REENCAUCHE (Unidades)
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
