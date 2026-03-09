const https = require('https');

function poll() {
  https.get('https://crm2-backend.onrender.com/api/admin/debug-jobs', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200 && !data.includes('Endpoint no encontrado')) {
        console.log('--- DEBUG ENDPOINT READY ---');
        try {
          const json = JSON.parse(data);
          console.log('\nJOBS:');
          console.table(json.jobs);
          console.log('\nNOTIFS:');
          console.table(json.notifications);
        } catch(e) {
          console.log('Raw data:', data);
        }
      } else {
        process.stdout.write('.');
        setTimeout(poll, 15000);
      }
    });
  }).on('error', (err) => {
    process.stdout.write('!');
    setTimeout(poll, 15000);
  });
}

console.log("Polling Render for /api/admin/debug-jobs ...");
poll();
