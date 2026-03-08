-- Native Send: SMS queue table + smsSendMethod on organizations
-- Run this before deploying the native send feature

-- Add smsSendMethod to organizations (platform = Telnyx, native = BGD's phone)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sms_send_method TEXT DEFAULT 'platform';

-- SMS queue for messages waiting to be sent by companion app
CREATE TABLE IF NOT EXISTS sms_queue (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dog_id INT NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  image_url TEXT,
  pawfile_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queue lookups by org + status
CREATE INDEX IF NOT EXISTS idx_sms_queue_org_status ON sms_queue(organization_id, status);

-- Index for cleanup of old items
CREATE INDEX IF NOT EXISTS idx_sms_queue_created ON sms_queue(created_at);
