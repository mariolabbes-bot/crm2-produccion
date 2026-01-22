const app = require('./serverApp');
const { startKeepAlive } = require('./keepAlive');
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces para Render

console.log('🚀🚀🚀 SERVIDOR CRM2 - VERSIÓN 2.0.2 - 2025-12-04 🚀🚀🚀');
console.log('✅ NUEVO: Widget ImportStats + endpoint /api/import-stats/stats');

// Iniciar Workers en el mismo proceso (para deployments simples en Render)
try {
  require('./worker');
  console.log('✅ [Main] Workers in-process iniciados correctamente');
} catch (err) {
  console.error('❌ [Main] Error al iniciar Workers:', err);
}

// Iniciar servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
  console.log('📊 Endpoints de clientes: ACTUALIZADOS');
  console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs (si está habilitado)`);

  // Iniciar keep-alive service para evitar que Render se duerma
  startKeepAlive();

  // Iniciar Cron Jobs de importación automática
  try {
    const { initCronJobs } = require('./services/cronService');
    initCronJobs();
  } catch (err) {
    console.error('❌ Error iniciando Cron Service:', err);
  }
});
