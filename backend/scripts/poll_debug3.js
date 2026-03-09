const https = require('https');

function poll() {
    https.get('https://crm2-backend.onrender.com/api/admin/debug-jobs', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200 && !data.includes('Endpoint no encontrado')) {
                try {
                    const json = JSON.parse(data);
                    if (json.users && json.users.length > 0) {
                        console.log('--- USERS ---');
                        console.table(json.users);
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

console.log("Polling Render for updated /api/admin/debug-jobs with Users array ...");
poll();
