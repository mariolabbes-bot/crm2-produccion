const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = () => {
  if (transporter) return transporter;
  const smtpUrl = process.env.SMTP_URL; // e.g. smtp://user:pass@smtp.example.com:587
  if (!smtpUrl) {
    console.log('⚠️ SMTP_URL not configured. EmailProvider will simulate sends.');
    return null;
  }
  transporter = nodemailer.createTransport(smtpUrl);
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const t = initTransporter();
  if (!t) {
    console.log('EmailProvider simulate send', { to, subject });
    return { status: 'simulated' };
  }

  const info = await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to, subject, text, html });
  return { status: 'sent', messageId: info.messageId, raw: info };
};

module.exports = { sendEmail };
