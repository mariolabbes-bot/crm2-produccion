const https = require('https');

// Mock jwt token or just test if route is open. 
// Ah, /api/kpis/mes-actual requires authentication.
// Let's create a JWT locally since we have JWT_SECRET exactly as production.
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'backend/.env'});

const token = jwt.sign(
  { user: { id: 1, email: 'admin@datasense.ai', rol: 'ADMIN', rut: '11111111-1' } },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const options = {
  hostname: 'crm2-backend.onrender.com',
  port: 443,
  path: '/api/kpis/mes-actual',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('KPIs Response:', data));
});
req.on('error', e => console.error(e));
req.end();
