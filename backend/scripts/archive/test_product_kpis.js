require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testApiLogic() {
    try {
        console.log('--- Probando Lógica de KPIs (TABLA MAESTRA) ---');

        const now = new Date();
        const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endCurrent = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const startLast = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];
        const endLast = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0).toISOString().split('T')[0];

        console.log(`Periodo Actual: ${startCurrent} - ${endCurrent}`);

        const getKpi = async (label, valueExpression, whereClause) => {
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
            const res = await pool.query(query, [startCurrent, endCurrent, startLast, endLast]);
            const cur = parseFloat(res.rows.find(r => r.period === 'Current')?.total || 0);
            const last = parseFloat(res.rows.find(r => r.period === 'LastYear')?.total || 0);
            console.log(`[${label}] Current: ${cur.toFixed(2)} | Last: ${last.toFixed(2)}`);
        };

        // New Logics with CP table
        await getKpi('Litros Lubricantes', 'v.cantidad * cp.litros', "UPPER(cp.familia) = 'LUBRICANTES'");
        await getKpi('TBR Aplus', 'v.cantidad', "UPPER(cp.subfamilia) = 'NEUMATICOS TBR' AND UPPER(cp.marca) = 'APLUS'");
        await getKpi('PCR Aplus', 'v.cantidad', "UPPER(cp.subfamilia) = 'NEUMATICOS PCR' AND UPPER(cp.marca) = 'APLUS'");
        await getKpi('Reencauche', 'v.cantidad', "UPPER(cp.familia) = 'REENCAUCHE'");

    } catch (e) { console.error(e); } finally { await pool.end(); }
}

testApiLogic();
