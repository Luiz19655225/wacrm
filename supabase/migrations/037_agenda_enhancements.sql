-- ============================================================
-- 037_agenda_enhancements.sql
--
-- Fase 8.0 — Agenda WAVON.
--
-- Purely additive on top of 036. Extends calendar_appointments
-- with structured fields (reason, origin, assigned_user_id) that
-- were previously embedded as free text in the `notes` column.
-- Also expands the provider_type and status constraints to support
-- LOCAL appointments and rescheduled status, and adds four indexes
-- that enable the Agenda UI queries and future KPI dashboard.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. New operational columns
-- ============================================================
ALTER TABLE calendar_appointments
  ADD COLUMN IF NOT EXISTS reason           TEXT,
  ADD COLUMN IF NOT EXISTS origin           TEXT
    CHECK (origin IN ('Widget','WhatsApp','Inbox','Manual','Google','Outlook','API')),
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 2. provider_type: add LOCAL (native WAVON appointments that
--    are not backed by any external calendar provider).
--    Existing rows stay GOOGLE or OUTLOOK — no data migration needed.
-- ============================================================
ALTER TABLE calendar_appointments
  DROP CONSTRAINT IF EXISTS calendar_appointments_provider_type_check;
ALTER TABLE calendar_appointments
  ADD CONSTRAINT calendar_appointments_provider_type_check
    CHECK (provider_type IN ('GOOGLE', 'OUTLOOK', 'LOCAL'));

-- ============================================================
-- 3. status: add rescheduled.
--    Existing rows keep their current status (scheduled /
--    cancelled / completed) — all remain valid after this change.
-- ============================================================
ALTER TABLE calendar_appointments
  DROP CONSTRAINT IF EXISTS calendar_appointments_status_check;
ALTER TABLE calendar_appointments
  ADD CONSTRAINT calendar_appointments_status_check
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled'));

-- ============================================================
-- 4. Indexes
-- ============================================================

-- Range queries for the monthly / weekly / daily calendar views.
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_account_range
  ON calendar_appointments(account_id, start_at, status);

-- Client timeline (future): join all activity for one contact.
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_contact
  ON calendar_appointments(contact_id, start_at)
  WHERE contact_id IS NOT NULL;

-- KPI dashboard (future): aggregate by status, origin and date.
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_kpi
  ON calendar_appointments(account_id, status, origin, start_at);

-- Unique key used by POST /api/calendar/sync upsert logic.
-- Partial (WHERE NOT NULL) mirrors the billing_events pattern:
-- LOCAL appointments have NULL external_event_id and are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_appointments_external_id
  ON calendar_appointments(account_id, external_event_id)
  WHERE external_event_id IS NOT NULL;
