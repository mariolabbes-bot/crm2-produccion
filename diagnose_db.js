process.env.DB_SSL = 'false';
const pool = require('./backend/src/db');

async function diagnose() {
    try {
        console.log('🔍 Iniciando Diagnóstico de Base de Datos...');

        // 1. Verificar tabla usuario
        console.log('\n--- Tabla: usuario ---');
        const userCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'usuario'
        `);
        console.log('Columnas:', userCols.rows.map(r => r.column_name).join(', '));

        // 2. Verificar tabla venta
        console.log('\n--- Tabla: venta ---');
        const ventaCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'venta'
        `);
        console.log('Columnas:', ventaCols.rows.map(r => r.column_name).join(', '));

        // 3. Probar consulta de alias
        console.log('\n--- Prueba de consulta de alias ---');
        // Usar un RUT que sepamos que existe (podemos buscar uno primero)
        const sampleUser = await pool.query('SELECT rut FROM usuario LIMIT 1');
        if (sampleUser.rows.length > 0) {
            const rut = sampleUser.rows[0].rut;
            console.log(`Probando RUT: ${rut}`);
            try {
                const res = await pool.query('SELECT alias FROM usuario WHERE id = $1 OR rut = $1', [rut]);
                console.log('Resultado (id OR rut): OK', res.rows[0]);
            } catch (e) {
                console.error('Resultado (id OR rut): FALLA', e.message);
            }
            try {
                const res = await pool.query('SELECT alias FROM usuario WHERE rut = $1', [rut]);
                console.log('Resultado (solo rut): OK', res.rows[0]);
            } catch (e) {
                console.error('Resultado (solo rut): FALLA', e.message);
            }
        }

        // 4. Probar consulta de KPIs
        console.log('\n--- Prueba de consulta de KPIs ---');
        const start = '2026-02-01';
        const end = '2026-02-28';
        try {
            const query = `
                SELECT 
                    SUM(v.cantidad * cp.litros) as total
                FROM venta v
                JOIN clasificacion_productos cp ON v.sku = cp.sku
                WHERE v.fecha_emision BETWEEN $1 AND $2
                  AND UPPER(cp.familia) LIKE '%LUBRICANTE%'
            `;
            const res = await pool.query(query, [start, end]);
            console.log('Consulta KPIs Lubricantes: OK', res.rows[0]);
        } catch (e) {
            console.error('Consulta KPIs Lubricantes: FALLA', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fatal en diagnóstico:', err);
        process.exit(1);
    }
}

diagnose();
