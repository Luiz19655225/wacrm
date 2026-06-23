-- ============================================================
-- 028_account_connections
--
-- New, standalone table for the multi-provider channel
-- architecture (QR Code / Evolution and Meta API / Meta). This is
-- entirely separate from `whatsapp_config` — the table that powers
-- today's live Meta Cloud API connection, message send/receive,
-- templates and broadcasts. `whatsapp_config` is not touched by
-- this migration and keeps working exactly as it does today.
--
-- `account_connections` is foundation only in phase 1: rows can be
-- created as placeholders, but no adapter actually drives a real
-- connection through this table yet (see src/lib/channels/).
--
-- No UNIQUE(account_id) — unlike whatsapp_config, this table is
-- designed to hold more than one connection per account (plan
-- limits on connection count are a phase-3 application-level
-- concern, not a schema constraint).
--
-- connection_status includes the full phase-4 QR-pairing vocabulary
-- up front ('pending' / 'qrcode_ready' / 'connected' /
-- 'disconnected' / 'error') so that later phase doesn't need a
-- migration just to widen this CHECK.
--
-- Re-runnable by design, same posture as 024_billing_plans.sql,
-- 026_billing_events.sql and 027_usage_counters.sql: CREATE TABLE IF
-- NOT EXISTS, CREATE INDEX IF NOT EXISTS, ENABLE ROW LEVEL SECURITY,
-- and DROP POLICY IF EXISTS + CREATE POLICY are each individually
-- idempotent. The four ADD CONSTRAINT statements are wrapped in DO
-- blocks for the same reason — Postgres has no ADD CONSTRAINT IF NOT
-- EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,

  connection_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'pending',

  -- User-facing name, e.g. "WhatsApp Vendas" — useful once an
  -- account can have more than one connection.
  label TEXT,
  -- True for the connection the rest of the app should treat as
  -- the account's default/active one when more than one exists.
  -- Enforced as "at most one primary per account" below.
  is_primary BOOLEAN NOT NULL DEFAULT false,

  phone_number TEXT,
  -- Provider-specific identifier: Evolution instance id, or (for
  -- META_API rows) duplicates meta_phone_number_id for a
  -- provider-agnostic lookup key.
  external_id TEXT,
  meta_waba_id TEXT,
  meta_phone_number_id TEXT,

  -- Encrypted blob (same AES-256-GCM helper as whatsapp_config's
  -- access_token/verify_token — src/lib/whatsapp/encryption.ts) for
  -- whatever credential shape the provider needs. Never stored in
  -- plaintext, never exposed to the client.
  credentials_encrypted TEXT,
  -- Non-secret structured extras that don't warrant their own
  -- column (e.g. last QR pairing code issued, sync timestamps).
  metadata JSONB NOT NULL DEFAULT '{}',

  connected_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.account_connections
    ADD CONSTRAINT account_connections_type_check
    CHECK (connection_type IN ('QR_CODE', 'META_API'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.account_connections
    ADD CONSTRAINT account_connections_provider_check
    CHECK (provider IN ('EVOLUTION', 'META'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.account_connections
    ADD CONSTRAINT account_connections_status_check
    CHECK (connection_status IN ('pending', 'qrcode_ready', 'connected', 'disconnected', 'error'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Encodes today's product decision (QR Code -> Evolution, Meta API
-- -> Meta) while keeping the two concepts separate columns, so a
-- second QR-capable provider could be added later without
-- reshaping this table — just loosen this one constraint.
DO $$
BEGIN
  ALTER TABLE public.account_connections
    ADD CONSTRAINT account_connections_type_provider_pairing_check
    CHECK (
      (connection_type = 'QR_CODE' AND provider = 'EVOLUTION') OR
      (connection_type = 'META_API' AND provider = 'META')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_account_connections_account ON public.account_connections(account_id);

-- At most one primary connection per account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_connections_one_primary
  ON public.account_connections(account_id)
  WHERE is_primary;

ALTER TABLE public.account_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_connections_select ON public.account_connections;
CREATE POLICY account_connections_select ON public.account_connections FOR SELECT
  USING (public.is_account_member(account_id));

DROP POLICY IF EXISTS account_connections_insert ON public.account_connections;
CREATE POLICY account_connections_insert ON public.account_connections FOR INSERT
  WITH CHECK (public.is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_connections_update ON public.account_connections;
CREATE POLICY account_connections_update ON public.account_connections FOR UPDATE
  USING (public.is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_connections_delete ON public.account_connections;
CREATE POLICY account_connections_delete ON public.account_connections FOR DELETE
  USING (public.is_account_member(account_id, 'admin'));
