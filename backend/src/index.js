const app = require('./serverApp');
const { startKeepAlive } = require('./keepAlive');
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces para Render

console.log('🚀🚀🚀 SERVIDOR CRM2 - VERSIÓN 2.0.2 - 2025-12-04 🚀🚀🚀');

// MIGRACIÓN AUTOMÁTICA DE EMERGENCIA (004 - Flujo Vendedor)
const runEmergencyMigration = async () => {
  const pool = require('./db');
  const client = await pool.connect();
  try {
    console.log('👷 [Migration] Ejecutando verificación de esquema 004...');
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_types (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='notas') THEN
          ALTER TABLE visitas_registro ADD COLUMN notas TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='activity_type_id') THEN
          ALTER TABLE visitas_registro ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cliente_actividad' AND column_name='activity_type_id') THEN
          ALTER TABLE cliente_actividad ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
        END IF;
      END $$;
    `);
    await client.query('COMMIT');
    console.log('✅ [Migration] Esquema 004 verificado/actualizado correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Error en migración automática:', err.message);
  } finally {
    client.release();
  }
};

// MIGRACIÓN AUTOMÁTICA DE EMERGENCIA (005 - Agenda Integral)
const runAgendaMigration = async () => {
  const pool = require('./db');
  const client = await pool.connect();
  try {
    console.log('👷 [Migration] Ejecutando verificación de esquema 005 (Agenda Integral)...');
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE visitas_registro ALTER COLUMN cliente_rut DROP NOT NULL;
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='titulo') THEN
          ALTER TABLE visitas_registro ADD COLUMN titulo VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='tipo_evento') THEN
          ALTER TABLE visitas_registro ADD COLUMN tipo_evento VARCHAR(50) DEFAULT 'ruta';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='hora_inicio_plan') THEN
          ALTER TABLE visitas_registro ADD COLUMN hora_inicio_plan TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='hora_fin_plan') THEN
          ALTER TABLE visitas_registro ADD COLUMN hora_fin_plan TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitas_registro' AND column_name='participantes') THEN
          ALTER TABLE visitas_registro ADD COLUMN participantes JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
    await client.query('COMMIT');
    console.log('✅ [Migration] Esquema 005 verificado/actualizado correctamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Error en migración 005:', err.message);
  } finally {
    client.release();
  }
};

runEmergencyMigration();
runAgendaMigration();
console.log('✅ NUEVO: Widget ImportStats + endpoint /api/import-stats/stats');

// Iniciar Workers en el mismo proceso (para deployments simples en Render)
try {
  require('./worker');
  require('./workers/importBullWorker'); // Force start import worker
  console.log('✅ [Main] Workers in-process iniciados correctamente');
} catch (err) {
  console.error('❌ [Main] Error al iniciar Workers:', err);
}

// Cargar diccionarios en memoria
try {
  const { refreshSucursalAliasCache } = require('./services/sucursalAliasService');
  refreshSucursalAliasCache();
} catch (e) {
  console.error('❌ Error cargando sucursalAliasCache:', e);
}

// Iniciar servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
  console.log('📊 Endpoints de clientes: ACTUALIZADOS');
  console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs (si está habilitado)`);

  // Iniciar keep-alive service para evitar que Render se duerma
  startKeepAlive();

  // Iniciar Google Drive Watcher (Importación Automática)
  try {
    const { startScheduler } = require('./services/importAutomation');
    startScheduler();
  } catch (err) {
    console.error('❌ Error iniciando Drive Automation:', err);
  }

  // Iniciar Cron Jobs de importación automática
  try {
    const { initCronJobs } = require('./services/cronService');
    initCronJobs();
  } catch (err) {
    console.error('❌ Error iniciando Cron Service:', err);
  }
});
