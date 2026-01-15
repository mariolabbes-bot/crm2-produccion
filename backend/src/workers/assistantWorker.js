/**
 * Assistant worker wrapper: if REDIS_URL is configured, delegate to Bull-backed worker.
 * Otherwise use the in-memory queue for prototype/dev.
 */
const pool = require('../db');
const { sendWhatsApp } = require('../providers/twilioProvider');
const { sendEmail } = require('../providers/emailProvider');

let enqueue;

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS;
if (REDIS_URL) {
  try {
    // Use Bull-backed worker
    const bullWorker = require('./assistantBullWorker');
    enqueue = bullWorker.enqueue;
    console.log('assistantWorker: using Bull-backed queue');
  } catch (err) {
    console.error('assistantWorker failed to load Bull worker, falling back to in-memory', err.message || err);
  }
}

// Fallback in-memory queue
if (!enqueue) {
  const inMemoryQueue = [];
  let running = false;
  let nextJobId = 1;

  enqueue = (job) => {
    const id = `mem-${nextJobId++}`;
    const payload = { id, ...job };
    inMemoryQueue.push(payload);
    if (!running) run();
    return id;
  };

  const run = async () => {
    running = true;
    while (inMemoryQueue.length > 0) {
      const job = inMemoryQueue.shift();
      try {
        if (job.type === 'send_whatsapp') {
          const r = await sendWhatsApp({ to: job.to, body: job.text, mediaUrls: job.media || [] });
          await pool.query('UPDATE assistant_audit SET status=$1, provider_job_id=$2, updated_at=NOW() WHERE id=$3', ['done', r.provider_id || null, job.audit_id]);
        } else if (job.type === 'send_email') {
          const r = await sendEmail({ to: job.to, subject: job.subject, html: job.html, text: job.text });
          await pool.query('UPDATE assistant_audit SET status=$1, provider_job_id=$2, updated_at=NOW() WHERE id=$3', ['done', r.messageId || null, job.audit_id]);
        }
      } catch (err) {
        console.error('assistantWorker job failed', err.message || err);
        try { await pool.query('UPDATE assistant_audit SET status=$1, note=$2, updated_at=NOW() WHERE id=$3', ['failed', err.message, job.audit_id]); } catch (e) { console.error('Failed updating audit status', e.message || e); }
      }
    }
    running = false;
  };
}

module.exports = { enqueue };
