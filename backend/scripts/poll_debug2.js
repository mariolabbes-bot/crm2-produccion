const https = require('https');

function poll() {
  https.get('https://crm2-backend.onrender.com/api/admin/debug-jobs', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200 && !data.includes('Endpoint no encontrado')) {
        try {
          const json = JSON.parse(data);
          // Wait until the new array format with vendedor_cliente is deployed
          if (Array.isArray(json.stats) && json.stats.length > 0 && json.stats[0].vendedor_cliente !== undefined) {
            console.log('--- DB STATS ---');
            console.table(json.stats);
            process.exit(0);
          } else {
            process.stdout.write('~');
            setTimeout(poll, 15000);
          }
        } catch (e) {
          process.stdout.write('E');
          setTimeout(poll, 15000);
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

console.log("Polling Render for updated /api/admin/debug-jobs ...");
poll();
