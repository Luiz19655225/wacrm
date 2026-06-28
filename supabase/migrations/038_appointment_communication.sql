-- ============================================================
-- 038_appointment_communication.sql -- Fase 8.1.4
-- ============================================================

-- 1. Expand status constraint
ALTER TABLE calendar_appointments
  DROP CONSTRAINT IF EXISTS calendar_appointments_status_check;

ALTER TABLE calendar_appointments
  ADD CONSTRAINT calendar_appointments_status_check
    CHECK (status IN (
      'scheduled', 'confirmed', 'rescheduled',
      'completed', 'cancelled', 'no_show'
    ));

-- 2. Communication preference columns (one statement each)
ALTER TABLE calendar_appointments
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

ALTER TABLE calendar_appointments
  ADD COLUMN IF NOT EXISTS comm_confirmation_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE calendar_appointments
  ADD COLUMN IF NOT EXISTS comm_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE calendar_appointments
  ADD COLUMN IF NOT EXISTS comm_channel TEXT NOT NULL DEFAULT 'whatsapp';

ALTER TABLE calendar_appointments
  DROP CONSTRAINT IF EXISTS calendar_appointments_comm_channel_check;

ALTER TABLE calendar_appointments
  ADD CONSTRAINT calendar_appointments_comm_channel_check
    CHECK (comm_channel IN ('whatsapp', 'email', 'both'));

-- 3. appointment_comm_log
CREATE TABLE IF NOT EXISTS appointment_comm_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL REFERENCES calendar_appointments(id) ON DELETE CASCADE,
  account_id     UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type     TEXT        NOT NULL CHECK (event_type IN ('status_changed','reminder_sent','confirmation_sent','confirmation_received','send_error','note_added')),
  channel        TEXT        CHECK (channel IN ('whatsapp', 'email', 'system', 'manual')),
  old_status     TEXT,
  new_status     TEXT,
  message        TEXT        NOT NULL,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_log_appointment
  ON appointment_comm_log(appointment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comm_log_account
  ON appointment_comm_log(account_id, created_at DESC);

ALTER TABLE appointment_comm_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comm_log_select" ON appointment_comm_log;

CREATE POLICY "comm_log_select"
  ON appointment_comm_log
  FOR SELECT
  USING (is_account_member(account_id));
