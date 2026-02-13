
require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
};

async function measurePerformance() {
    try {
        console.log('--- STARTING PERFORMANCE MEASUREMENT ---');
        console.time('Total Execution');

        const now = new Date();
        const currentMonth = getMonthRange(now);
        const lastYearDate = new Date(now);
        lastYearDate.setFullYear(now.getFullYear() - 1);
        const lastYearMonth = getMonthRange(lastYearDate);

        const queryParams = [currentMonth.start, currentMonth.end, lastYearMonth.start, lastYearMonth.end];

        // Simulate targetRut (optional)
        // const targetRut = '12345678-9'; 
        const targetRut = null;
        let dynamicWhere = '';
        let vendorJoin = '';

        if (targetRut) {
            queryParams.push(targetRut);
            vendorJoin = `
                LEFT JOIN usuario u_filt ON UPPER(TRIM(u_filt.nombre_vendedor)) = UPPER(TRIM(v.vendedor_cliente))
                LEFT JOIN usuario u2_filt ON UPPER(TRIM(u2_filt.alias)) = UPPER(TRIM(v.vendedor_documento))
            `;
            dynamicWhere = `AND COALESCE(u_filt.rut, u2_filt.rut) = $${queryParams.length}`;
        }

        const runQuery = async (label, valueExpression, whereClause) => {
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

            console.time(label);
            await pool.query(query, queryParams);
            console.timeEnd(label);
        };

        await runQuery('1. Lubricantes', 'v.cantidad * cp.litros', "UPPER(cp.familia) LIKE '%LUBRICANTE%'");
        await runQuery('2. TBR', 'v.cantidad', "UPPER(cp.subfamilia) LIKE '%TBR%'");
        await runQuery('3. PCR', 'v.cantidad', "UPPER(cp.subfamilia) LIKE '%PCR%'");
        await runQuery('4. Reencauche', 'v.cantidad', "UPPER(cp.familia) LIKE '%REENCAUCHE%'");

        console.timeEnd('Total Execution');
        console.log('--- END ---');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

measurePerformance();
