const app = require('./serverApp');
const { startKeepAlive } = require('./keepAlive');
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces para Render

console.log('🚀🚀🚀 SERVIDOR CRM2 - VERSIÓN 2.0.1 - 2025-11-21 🚀🚀🚀');
console.log('✅ FIX: COUNT(*) implementado - NO más error "column id"');

app.listen(PORT, HOST, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
  console.log('📊 Endpoints de clientes: ACTUALIZADOS');
  
  // Iniciar keep-alive service para evitar que Render se duerma
  startKeepAlive();
});
