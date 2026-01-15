-- Migration: create assistant_audit table
CREATE TABLE IF NOT EXISTS assistant_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  intent TEXT,
  channel VARCHAR(32),
  entities JSONB,
  action_payload JSONB,
  status VARCHAR(32) DEFAULT 'pending',
  provider_job_id TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_audit_user ON assistant_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_status ON assistant_audit(status);
