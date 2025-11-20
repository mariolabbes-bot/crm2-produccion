const app = require('./serverApp');
const { startKeepAlive } = require('./keepAlive');
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces para Render

console.log('🚀 Iniciando servidor CRM2 - Versión: 2024-11-06 (sin vendedor_id)');

app.listen(PORT, HOST, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
  
  // Iniciar keep-alive service para evitar que Render se duerma
  startKeepAlive();
});
