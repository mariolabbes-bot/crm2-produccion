const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../src/db');
const { processClientesFileAsync } = require('../src/services/importers/clientes');

async function runVerification() {
    const jobId = 'TEST-JOB-' + Date.now();
    const testRut = '99999999-9';
    const testFile = path.join(__dirname, 'test_clientes_cupo.xlsx');

    try {
        console.log('🧪 Iniciando verificación de importación de Cupo...');

        // 0. Limpiar estado previo
        await pool.query('DELETE FROM cliente WHERE rut = $1', [testRut]);

        // 1. Crear archivo Excel de prueba
        const data = [
            {
                RUT: testRut,
                Nombre: 'Cliente Test Cupo',
                Email: 'test@cupo.cl',
                Cupo: 1000000,
                'Cupo Utilizado': 250000,
                Vendedor: 'Vendedor Test'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        XLSX.writeFile(wb, testFile);
        console.log('📄 Archivo de prueba creado:', testFile);

        // 2. Ejecutar importador
        console.log('🚀 Ejecutando importador...');
        // Mock updateJobStatus function needs to be handled or the import function needs to survive without it failing perfectly
        // The importer requires updateJobStatus from '../jobManager'.
        // Since I cannot easily mock require in this script without proxyquire, I will rely on the fact that jobManager might just work if it updates DB. 
        // However, jobManager might not be initialized.
        // Let's hope it just writes to a table and doesn't crash if job doesn't exist?
        // Actually, updateJobStatus probably updates a 'job' table. I should insert a dummy job first to be safe.

        await pool.query("INSERT INTO import_job (job_id, tipo, filename, status, user_rut, created_at) VALUES ($1, 'import_clientes', 'test_clientes_cupo.xlsx', 'pending', '99999999-9', NOW())", [jobId]);

        const result = await processClientesFileAsync(jobId, testFile, 'test_clientes_cupo.xlsx');
        console.log('Import result:', result);

        // 3. Verificar datos en DB
        const res = await pool.query('SELECT * FROM cliente WHERE rut = $1', [testRut]);
        const client = res.rows[0];

        if (!client) {
            throw new Error('Cliente no encontrado en DB tras importación');
        }

        console.log('📊 Datos en DB:', {
            rut: client.rut,
            nombre: client.nombre,
            cupo: client.cupo,
            cupo_utilizado: client.cupo_utilizado
        });

        // Validaciones
        if (String(client.cupo) !== '1000000') throw new Error(`Cupo incorrecto. Esperado: 1000000, Obtenido: ${client.cupo}`);
        if (String(client.cupo_utilizado) !== '250000') throw new Error(`Cupo Utilizado incorrecto. Esperado: 250000, Obtenido: ${client.cupo_utilizado}`);

        console.log('✅ Verificación EXITOSA: Los campos se importaron correctamente.');

    } catch (err) {
        console.error('❌ Verificación FALLIDA:', err);
    } finally {
        // Limpieza
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        await pool.query('DELETE FROM cliente WHERE rut = $1', [testRut]);
        await pool.query('DELETE FROM import_job WHERE job_id = $1', [jobId]);
        pool.end();
    }
}

runVerification();
