require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testApiLogic() {
    try {
        console.log('--- Probando Lógica de KPIs de Productos ---');

        // Simular lógica del endpoint
        const now = new Date();
        const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const startLast = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];
        const endLast = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0).toISOString().split('T')[0];

        console.log(`Periodo Actual: ${startCurrent} - ${endCurrent}`);
        console.log(`Periodo Anterior: ${startLast} - ${endLast}`);

        const getKpi = async (label, valueConfig, whereClause) => {
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
            const res = await pool.query(query, [startCurrent, endCurrent, startLast, endLast]);
            const cur = parseFloat(res.rows.find(r => r.period === 'Current')?.total || 0);
            const last = parseFloat(res.rows.find(r => r.period === 'LastYear')?.total || 0);
            console.log(`[${label}] Current: ${cur} | Last: ${last}`);
        };

        await getKpi('Litros Lubricantes', 'v.litros_vendidos', "UPPER(p.familia) = 'LUBRICANTES'");
        await getKpi('TBR Aplus', 'v.cantidad', "UPPER(p.subfamilia) = 'TBR' AND UPPER(p.marca) = 'APLUS'");
        await getKpi('PCR Aplus', 'v.cantidad', "UPPER(p.subfamilia) = 'PCR' AND UPPER(p.marca) = 'APLUS'");
        await getKpi('Reencauche', 'v.cantidad', "UPPER(p.familia) = 'REENCAUCHE'");

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

testApiLogic();
