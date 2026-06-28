-- ============================================================
-- 038_appointment_communication.sql
--
-- Fase 8.1.4 — Comunicação Inteligente da Agenda.
--
-- Purely additive on top of 037. Three changes:
--   1. Expand calendar_appointments.status to include 'confirmed'
--      and 'no_show'.
--   2. Add communication preference columns to calendar_appointments.
--   3. Create appointment_comm_log — audit trail for status changes
--      and future notification events (reminder, confirmation, etc.)
--
-- No data migration needed — existing rows keep their current
-- status values; new columns default to safe values (true / 'whatsapp').
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. Expand status constraint
--    Adds 'confirmed' (client confirmed attendance) and
--    'no_show' (client did not show up).
-- ============================================================
ALTER TABLE calendar_appointments
  DROP CONSTRAINT IF EXISTS calendar_appointments_status_check;

ALTER TABLE calendar_appointments
  ADD CONSTRAINT calendar_appointments_status_check
    CHECK (status IN (
      'scheduled',
      'confirmed',
      'rescheduled',
      'completed',
      'cancelled',
      'no_show'
    ));

-- ============================================================
-- 2. Communication preference columns
--    confirmed_at: timestamp set when status → 'confirmed'.
--    comm_*:       preferences for future automated messaging.
-- ============================================================
ALTER TABLE calendar_appointments
  ADD COLUMN IF NOT EXISTS confirmed_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comm_confirmation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS comm_reminder_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS comm_channel              TEXT    NOT NULL DEFAULT 'whatsapp'
    CHECK (comm_channel IN ('whatsapp', 'email', 'both'));

-- ============================================================
-- 3. appointment_comm_log
--    One row per event. Written server-side only (supabaseAdmin
--    bypasses RLS). Clients read via the API endpoint — this
--    SELECT policy covers direct Supabase client reads if ever
--    needed in the future.
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_comm_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL
                   REFERENCES calendar_appointments(id) ON DELETE CASCADE,
  account_id     UUID        NOT NULL
                   REFERENCES accounts(id) ON DELETE CASCADE,
  event_type     TEXT        NOT NULL
    CHECK (event_type IN (
      'status_changed',
      'reminder_sent',
      'confirmation_sent',
      'confirmation_received',
      'send_error',
      'note_added'
    )),
  channel        TEXT
    CHECK (channel IN ('whatsapp', 'email', 'system', 'manual')),
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

-- Any account member may read the log for their own account's appointments.
-- All writes go through supabaseAdmin (service role), which bypasses RLS.
DROP POLICY IF EXISTS "comm_log_select" ON appointment_comm_log;

CREATE POLICY "comm_log_select"
  ON appointment_comm_log
  FOR SELECT
  USING (is_account_member(account_id));
