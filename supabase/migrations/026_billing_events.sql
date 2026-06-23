-- ============================================================
-- 026_billing_events
--
-- Append-only ledger of inbound billing provider events (Asaas
-- webhooks, to start). Mirrors the `automation_logs` pattern:
-- service-role-only writes, admin+ read for audit/debugging.
--
-- `event_type` is OUR normalized event name; `provider_event_type`
-- keeps the provider's raw event string (e.g. Asaas's
-- "PAYMENT_RECEIVED") side by side, so a mapping bug is visible by
-- comparing the two columns instead of having to re-fetch the raw
-- payload. `external_event_id` is the provider's own event id when
-- it sends one — UNIQUE so a webhook retried by the provider (Asaas
-- retries on non-2xx) doesn't get double-processed.
--
-- Re-runnable by design, same posture as 024_billing_plans.sql:
-- CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, ENABLE ROW
-- LEVEL SECURITY, and DROP POLICY IF EXISTS + CREATE POLICY are each
-- individually idempotent. The two ADD CONSTRAINT statements are
-- wrapped in DO blocks for the same reason — Postgres has no ADD
-- CONSTRAINT IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- Our normalized name (e.g. 'payment_received', 'subscription_canceled').
  event_type TEXT NOT NULL,
  -- The provider's own event name, verbatim (e.g. 'PAYMENT_RECEIVED').
  provider_event_type TEXT,
  external_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  -- Lifecycle of our own handling of this event — separate from
  -- anything Asaas reports. 'pending' until the handler runs,
  -- 'processed' once it successfully applied its side effects,
  -- 'failed' if it threw (see error_message), 'ignored' for events
  -- we deliberately don't act on (e.g. ones for an unknown account).
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.billing_events
    ADD CONSTRAINT billing_events_provider_check CHECK (provider IN ('asaas'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.billing_events
    ADD CONSTRAINT billing_events_processing_status_check
    CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Partial unique index rather than a plain UNIQUE column: Asaas
-- doesn't guarantee every event carries an id, so NULLs (which are
-- always distinct from each other under a normal UNIQUE
-- constraint/index anyway) are explicitly excluded for clarity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_external_id
  ON public.billing_events(provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_events_account ON public.billing_events(account_id);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_events_select ON public.billing_events;
CREATE POLICY billing_events_select ON public.billing_events FOR SELECT
  USING (account_id IS NOT NULL AND public.is_account_member(account_id, 'admin'));

-- No write policy for regular users — only service-role (the
-- webhook handler) inserts/updates these rows.
