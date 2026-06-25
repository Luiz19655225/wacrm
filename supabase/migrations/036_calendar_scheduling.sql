-- ============================================================
-- 036_calendar_scheduling.sql
--
-- Fase 7.2 — Atendimento Fora do Horário + Agendamento Inteligente.
--
-- Purely additive on top of 035. Three new tables:
--   calendar_settings    — per-account calendar provider + encrypted OAuth tokens
--   business_hours       — per-account, per-weekday schedule (0=Sun … 6=Sat)
--   calendar_appointments — appointments booked through the system
--
-- All three follow the same RLS posture already established for ai_*
-- tables: any account member can read; only admin/owner can write.
-- Tokens are AES-256-GCM encrypted at rest (same key as ai_settings).
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. calendar_settings
--    One row per account. Stores the connected calendar provider,
--    encrypted OAuth tokens, and scheduling preferences.
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_settings (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               UUID        NOT NULL UNIQUE
                             REFERENCES accounts(id) ON DELETE CASCADE,
  provider_type            TEXT        NOT NULL
                             CHECK (provider_type IN ('OUTLOOK', 'GOOGLE')),
  -- OAuth tokens — AES-256-GCM encrypted (same as ai_settings.api_key_encrypted)
  access_token_encrypted   TEXT        NOT NULL,
  refresh_token_encrypted  TEXT,
  token_expires_at         TIMESTAMPTZ,
  -- Identity from the calendar provider
  calendar_email           TEXT,
  calendar_id              TEXT,       -- provider-specific calendar id (unused for Outlook personal)
  -- Scheduling preferences
  timezone                 TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
  meeting_duration_minutes INTEGER     NOT NULL DEFAULT 30
                             CHECK (meeting_duration_minutes > 0 AND meeting_duration_minutes <= 480),
  is_enabled               BOOLEAN     NOT NULL DEFAULT true,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_settings_select" ON calendar_settings
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "calendar_settings_insert" ON calendar_settings
  FOR INSERT WITH CHECK (
    is_account_member(account_id) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "calendar_settings_update" ON calendar_settings
  FOR UPDATE USING (
    is_account_member(account_id) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "calendar_settings_delete" ON calendar_settings
  FOR DELETE USING (
    is_account_member(account_id) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- ============================================================
-- 2. business_hours
--    One row per account per weekday. UNIQUE (account_id, day_of_week)
--    ensures the UI can upsert safely. start_time/end_time are TIME
--    columns so Postgres validates HH:MM:SS format automatically.
-- ============================================================
CREATE TABLE IF NOT EXISTS business_hours (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID     NOT NULL
                REFERENCES accounts(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open     BOOLEAN  NOT NULL DEFAULT false,
  start_time  TIME,
  end_time    TIME,
  timezone    TEXT     NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, day_of_week)
);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_hours_select" ON business_hours
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "business_hours_insert" ON business_hours
  FOR INSERT WITH CHECK (
    is_account_member(account_id) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "business_hours_update" ON business_hours
  FOR UPDATE USING (
    is_account_member(account_id) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "business_hours_delete" ON business_hours
  FOR DELETE USING (
    is_account_member(account_id) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- ============================================================
-- 3. calendar_appointments
--    One row per appointment booked through the system.
--    Linked to both a conversation and a contact for CRM traceability.
--    external_event_id is the provider's event ID (for future
--    cancel/reschedule support without a new migration).
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_appointments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID        NOT NULL
                        REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id     UUID
                        REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id          UUID
                        REFERENCES contacts(id) ON DELETE SET NULL,
  provider_type       TEXT        NOT NULL CHECK (provider_type IN ('OUTLOOK', 'GOOGLE')),
  external_event_id   TEXT,
  title               TEXT        NOT NULL,
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  online_meeting_url  TEXT,
  status              TEXT        NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calendar_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_appointments_select" ON calendar_appointments
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY "calendar_appointments_insert" ON calendar_appointments
  FOR INSERT WITH CHECK (is_account_member(account_id));

CREATE POLICY "calendar_appointments_update" ON calendar_appointments
  FOR UPDATE USING (is_account_member(account_id));

CREATE POLICY "calendar_appointments_delete" ON calendar_appointments
  FOR DELETE USING (is_account_member(account_id));

CREATE INDEX IF NOT EXISTS idx_calendar_appointments_conversation
  ON calendar_appointments(conversation_id);

CREATE INDEX IF NOT EXISTS idx_calendar_appointments_account_start
  ON calendar_appointments(account_id, start_at);
