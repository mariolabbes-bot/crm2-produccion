const https = require('https');

function poll() {
  https.get('https://crm2-backend.onrender.com/api/admin/trigger-drive', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response:', data);
      if (data.includes('Endpoint no encontrado') || res.statusCode === 502) {
        setTimeout(poll, 15000);
      } else {
        console.log('Endpoint hit successfully!');
      }
    });
  }).on('error', (err) => {
    console.log('Error:', err.message);
    setTimeout(poll, 15000);
  });
}

console.log("Polling Render...");
poll();
