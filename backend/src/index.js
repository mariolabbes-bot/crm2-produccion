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
      INSERT INTO activity_types (nombre, descripcion, icon)
      VALUES 
        ('VISITA', 'Visita presencial a local de cliente', 'directions_walk'),
        ('LLAMADA', 'Contacto telefónico comercial', 'phone'),
        ('COTIZACION', 'Generación o revisión de cotización', 'request_quote'),
        ('MENSAJE', 'Contacto vía WhatsApp o Mensajería', 'message')
      ON CONFLICT (nombre) DO UPDATE SET 
        descripcion = EXCLUDED.descripcion,
        icon = EXCLUDED.icon
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
runEmergencyMigration();
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
