require('dotenv').config();
const nodemailer = require('nodemailer');

const smtpUrl = process.env.SMTP_URL || process.argv[2];

if (!smtpUrl) {
    console.error('❌ Error: Debes proporcionar la variable SMTP_URL');
    console.error('Uso: SMTP_URL=... node scripts/test_smtp.js');
    process.exit(1);
}

console.log('📧 Probando conexión SMTP...');
console.log('URL (oculta password):', smtpUrl.replace(/:([^:@]+)@/, ':****@'));

const transporter = nodemailer.createTransport(smtpUrl);

const mailOptions = {
    from: 'Test CRM2 <no-reply@test.com>',
    to: 'mario.labbe@lubricar-insa.cl', // Send to self
    subject: '✅ Prueba de Configuración SMTP - CRM2',
    text: 'Si estás leyendo esto, la configuración de correo funciona correctamente.\n\nEste correo fue enviado desde script de prueba.',
    html: '<h2>✅ Configuración Exitosa</h2><p>Si estás leyendo esto, el envío de correos funciona correctamente.</p>'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('❌ Error enviando correo:', error);
        process.exit(1);
    } else {
        console.log('✅ Correo enviado exitosamente!');
        console.log('Message ID:', info.messageId);
        console.log('Revisa tu bandeja de entrada (mario.labbe@lubricar-insa.cl).');
        process.exit(0);
    }
});
