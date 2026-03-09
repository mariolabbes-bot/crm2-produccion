const https = require('https');

function poll() {
    https.get('https://crm2-backend.onrender.com/api/admin/fix-abonos', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200 && !data.includes('Endpoint no encontrado')) {
                console.log('--- FIX RESULT ---');
                console.log(data);
                process.exit(0);
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

console.log("Polling Render for /api/admin/fix-abonos ...");
poll();
