const axios = require('axios');

/**
 * Twilio WhatsApp provider (sandbox-ready). Requires env vars:
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. 'whatsapp:+1415XXXX')
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // 'whatsapp:+1415...'

if (!accountSid || !authToken) {
  console.log('⚠️ Twilio credentials not configured. TwilioProvider will be a no-op in dev.');
}

const sendWhatsApp = async ({ to, body, mediaUrls = [] }) => {
  if (!accountSid || !authToken || !whatsappFrom) {
    console.log('TwilioProvider: missing config, simulating send', { to, body, mediaUrls });
    return { status: 'simulated', provider_id: null };
  }

  // Use Twilio API to send message
  try {
    // Twilio messages endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const data = {
      From: whatsappFrom,
      To: `whatsapp:${to.replace(/^\+/, '')}`,
      Body: body
    };
    // If media provided, add MediaUrl[n]
    mediaUrls.forEach((m, idx) => data[`MediaUrl${idx}`] = m);

    // Use URLSearchParams for x-www-form-urlencoded
    const params = new URLSearchParams(data);

    const resp = await axios.post(url, params.toString(), {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return { status: 'sent', provider_id: resp.data.sid, raw: resp.data };
  } catch (err) {
    console.error('TwilioProvider sendWhatsApp error:', err?.response?.data || err.message);
    throw err;
  }
};

module.exports = { sendWhatsApp };
