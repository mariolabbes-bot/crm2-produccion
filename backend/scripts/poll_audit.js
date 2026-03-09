const https = require('https');
const fs = require('fs');
const path = require('path');

function poll() {
    https.get('https://crm2-backend.onrender.com/api/admin/debug-jobs', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200 && !data.includes('Endpoint no encontrado')) {
                try {
                    const json = JSON.parse(data);
                    if (json.audit) {
                        console.log('--- AUDIT DATA OBTAINED ---');
                        fs.writeFileSync(path.join(__dirname, '../outputs/audit_results.json'), JSON.stringify(json.audit, null, 2));
                        console.log('Saved to outputs/audit_results.json');
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

console.log("Polling Render for full vendor audit data ...");
poll();
