require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

(async () => {
  try {
    // Token para Alex (id=6) como vendedor
  const payload = { user: { id: 6, rol: 'vendedor' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
    console.log('Token generado (jwt):', token.slice(0, 32) + '...');

    const res = await axios.get('http://localhost:3001/api/clients/inactivos-mes-actual', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Status:', res.status);
    console.log('Total:', res.data.length);
    console.log('Primeros 3:', res.data.slice(0,3));
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data || err.message);
  }
})();
