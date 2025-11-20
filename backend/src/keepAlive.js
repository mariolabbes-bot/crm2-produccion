const https = require('https');

/**
 * Keep-alive service para evitar que Render Free Tier se duerma
 * Hace ping al propio servidor cada 10 minutos
 */

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutos en milisegundos
const BACKEND_URL = process.env.BACKEND_URL || 'https://crm2-backend.onrender.com';

function ping() {
  const url = `${BACKEND_URL}/api/health`;
  
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Keep-Alive] ✓ Ping exitoso (${new Date().toISOString()})`);
    } else {
      console.log(`[Keep-Alive] ⚠ Ping respondió con status ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error('[Keep-Alive] ✗ Error en ping:', err.message);
  });
}

function startKeepAlive() {
  // Solo activar en producción (Render)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Keep-Alive] Desactivado en desarrollo');
    return;
  }

  console.log(`[Keep-Alive] Iniciado - ping cada ${PING_INTERVAL / 60000} minutos`);
  
  // Primer ping después de 5 minutos (dar tiempo a que el servidor inicie)
  setTimeout(ping, 5 * 60 * 1000);
  
  // Luego cada 10 minutos
  setInterval(ping, PING_INTERVAL);
}

module.exports = { startKeepAlive };
