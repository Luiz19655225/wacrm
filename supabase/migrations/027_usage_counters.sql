-- ============================================================
-- 027_usage_counters
--
-- Schema-only foundation for plan-limit enforcement (phase 3).
-- Nothing in the app increments or reads these counters yet — this
-- migration just gives them a home so phase 3 doesn't need its own
-- migration for the table itself, only for wiring application code
-- to it.
--
-- One row per (account, metric, period). `period_start = NULL`
-- means an all-time/point-in-time counter (e.g. "connections in
-- use right now" — recountable, not accumulated); a non-null
-- `period_start` is for rolling-window metrics (e.g. "broadcasts
-- sent this month").
--
-- Re-runnable by design, same posture as 024_billing_plans.sql and
-- 026_billing_events.sql: CREATE TABLE IF NOT EXISTS, CREATE INDEX
-- IF NOT EXISTS, ENABLE ROW LEVEL SECURITY, and DROP POLICY IF
-- EXISTS + CREATE POLICY are each individually idempotent. The
-- ADD CONSTRAINT statement is wrapped in a DO block for the same
-- reason — Postgres has no ADD CONSTRAINT IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  -- e.g. 'team_members', 'connections', 'automations', 'broadcasts_sent'.
  metric_key TEXT NOT NULL,
  period_start DATE,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A plain UNIQUE constraint treats two NULL `period_start` values as
-- distinct, which would let an all-time counter for the same
-- (account, metric) get duplicated. COALESCE to a fixed sentinel
-- date for all-time rows so the uniqueness check actually applies.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_counters_unique
  ON public.usage_counters(account_id, metric_key, COALESCE(period_start, '0001-01-01'::date));

DO $$
BEGIN
  ALTER TABLE public.usage_counters
    ADD CONSTRAINT usage_counters_value_non_negative CHECK (value >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_counters_select ON public.usage_counters;
CREATE POLICY usage_counters_select ON public.usage_counters FOR SELECT
  USING (public.is_account_member(account_id));

-- No write policy for regular users — counters are only ever
-- written by service-role application code (phase 3), never
-- directly by a client.
