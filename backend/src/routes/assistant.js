const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendWhatsApp } = require('../providers/twilioProvider');
const { sendEmail } = require('../providers/emailProvider');
const { enqueue } = require('../workers/assistantWorker');

// Simple rule-based parser for prototype
function parseMessage(message, context = {}) {
  const txt = (message || '').toLowerCase();
  // Intent: send_quote_to_client
  const matchSendToClient = txt.match(/enviar (?:la )?cotiz(?:aci[oó]n|on) .* a cliente ([0-9kK\-\.]+)/i);
  if (matchSendToClient) {
    return {
      intent: 'send_quote_to_client',
      entities: { rut: matchSendToClient[1] },
      suggestedAction: {
        type: 'send_whatsapp',
        channel: 'whatsapp',
        preview: { text: `Adjunto cotización solicitada.`, media: [] },
        requiresConfirmation: true
      }
    };
  }

  // Intent: list_clients_by_product
  const matchListBySku = txt.match(/clientes que compran (?:el |la )?sku[: ]?\s*([A-Za-z0-9\-_]+)/i);
  if (matchListBySku) {
    return {
      intent: 'list_clients_by_product',
      entities: { sku: matchListBySku[1] },
      suggestedAction: { type: 'show_clients', preview: null, requiresConfirmation: false }
    };
  }

  // Default fallback
  return { intent: 'unknown', entities: {}, suggestedAction: { type: 'reply', preview: { text: "No entendí. Puedes pedir 'enviar cotización a cliente <RUT>' o 'clientes que compran SKU'" }, requiresConfirmation: false } };
}

// POST /api/assistant/parse
router.post('/parse', auth(), async (req, res) => {
  try {
    const { message, context } = req.body;
    const parsed = parseMessage(message, context);
    // Save an audit draft
    const insert = await pool.query(
      'INSERT INTO assistant_audit (user_id, intent, channel, entities, action_payload, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, parsed.intent, parsed.suggestedAction.channel || null, JSON.stringify(parsed.entities), JSON.stringify(parsed.suggestedAction), 'draft']
    );
    const audit = insert.rows[0];
    res.json({ success: true, parsed, audit_id: audit.id });
  } catch (err) {
    console.error('assistant/parse error', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/execute
router.post('/execute', auth(), async (req, res) => {
  try {
    const { audit_id, action } = req.body;
    if (!audit_id || !action) return res.status(400).json({ msg: 'audit_id and action required' });

    // Update audit to queued and enqueue job
    await pool.query('UPDATE assistant_audit SET status=$1, action_payload=$2, updated_at=NOW() WHERE id=$3', ['queued', JSON.stringify(action), audit_id]);

    // Build job for worker
    const job = {
      audit_id,
      type: action.type,
      to: action.to,
      text: action.text || (action.preview && action.preview.text) || '',
      media: action.media || [],
      subject: action.subject,
      html: action.html
    };

    const jobId = enqueue(job);
    res.json({ success: true, status: 'queued', job_id: jobId });
  } catch (err) {
    console.error('assistant/execute error', err?.response?.data || err.message);
    // update audit to failed if possible
    if (req.body && req.body.audit_id) {
      try { await pool.query('UPDATE assistant_audit SET status=$1, note=$2, updated_at=NOW() WHERE id=$3', ['failed', err.message, req.body.audit_id]); } catch (e) { console.error('Failed updating audit status', e.message); }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
