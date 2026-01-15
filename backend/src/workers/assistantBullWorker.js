const Queue = require('bull');
const Redis = require('ioredis');
const pool = require('../db');
const { sendWhatsApp } = require('../providers/twilioProvider');
const { sendEmail } = require('../providers/emailProvider');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://localhost:6379';
// if (!REDIS_URL) {
//   throw new Error('REDIS_URL is required for assistantBullWorker');
// }

const redis = new Redis(REDIS_URL);

const assistantQueue = new Queue('assistant-jobs', { redis: REDIS_URL });

assistantQueue.process(async (job) => {
  const data = job.data;
  try {
    if (data.type === 'send_whatsapp') {
      const r = await sendWhatsApp({ to: data.to, body: data.text, mediaUrls: data.media || [] });
      await pool.query('UPDATE assistant_audit SET status=$1, provider_job_id=$2, updated_at=NOW() WHERE id=$3', ['done', r.provider_id || null, data.audit_id]);
    } else if (data.type === 'send_email') {
      const r = await sendEmail({ to: data.to, subject: data.subject, html: data.html, text: data.text });
      await pool.query('UPDATE assistant_audit SET status=$1, provider_job_id=$2, updated_at=NOW() WHERE id=$3', ['done', r.messageId || null, data.audit_id]);
    } else {
      // Unknown job type - mark failed
      await pool.query('UPDATE assistant_audit SET status=$1, note=$2, updated_at=NOW() WHERE id=$3', ['failed', `unknown job type ${data.type}`, data.audit_id]);
    }
    return Promise.resolve();
  } catch (err) {
    console.error('assistantBullWorker job failed', err?.message || err);
    try {
      await pool.query('UPDATE assistant_audit SET status=$1, note=$2, updated_at=NOW() WHERE id=$3', ['failed', err.message || String(err), data.audit_id]);
    } catch (e) {
      console.error('assistantBullWorker failed updating audit', e.message || e);
    }
    throw err;
  }
});

const enqueue = async (job) => {
  const bullJob = await assistantQueue.add(job, { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  return `bull-${bullJob.id}`;
};

module.exports = { enqueue, assistantQueue };
