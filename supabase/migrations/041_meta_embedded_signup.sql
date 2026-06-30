-- ============================================================
-- 041_meta_embedded_signup
--
-- Extends account_connections and whatsapp_config to support the
-- Meta Embedded Signup OAuth flow as a second connection method,
-- coexisting with the existing manual connection ('manual' provider).
--
-- account_connections:
--   • provider CHECK extended to include 'META_EMBEDDED'
--   • connection_type CHECK extended to include 'META_EMBEDDED'
--   • type↔provider pairing constraint updated accordingly
--
-- whatsapp_config:
--   • provider column added (default 'manual') — distinguishes
--     manual entry from OAuth-originated connections
--   • coexistence_enabled — true when both methods are active
--   • organization_id — Meta Business Portfolio ID from Embedded Signup
--
-- All existing rows get provider='manual', coexistence_enabled=false,
-- organization_id=NULL (safe defaults — no behavior change for
-- existing manual connections).
-- ============================================================

-- ── account_connections: widen CHECK constraints ──────────────────

-- Drop old constraints (IF EXISTS is safe to run multiple times)
ALTER TABLE public.account_connections
  DROP CONSTRAINT IF EXISTS account_connections_provider_check;

ALTER TABLE public.account_connections
  DROP CONSTRAINT IF EXISTS account_connections_type_check;

ALTER TABLE public.account_connections
  DROP CONSTRAINT IF EXISTS account_connections_type_provider_pairing_check;

-- Re-create with META_EMBEDDED included
ALTER TABLE public.account_connections
  ADD CONSTRAINT account_connections_provider_check
  CHECK (provider IN ('EVOLUTION', 'META', 'META_EMBEDDED'));

ALTER TABLE public.account_connections
  ADD CONSTRAINT account_connections_type_check
  CHECK (connection_type IN ('QR_CODE', 'META_API', 'META_EMBEDDED'));

ALTER TABLE public.account_connections
  ADD CONSTRAINT account_connections_type_provider_pairing_check
  CHECK (
    (connection_type = 'QR_CODE'       AND provider = 'EVOLUTION')    OR
    (connection_type = 'META_API'      AND provider = 'META')         OR
    (connection_type = 'META_EMBEDDED' AND provider = 'META_EMBEDDED')
  );

-- ── whatsapp_config: add coexistence columns ──────────────────────

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS coexistence_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add CHECK constraint for provider (separate from ADD COLUMN — see
-- project gotcha: inline CHECK on ADD COLUMN causes 42601 in Supabase)
DO $$
BEGIN
  ALTER TABLE public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_provider_check
    CHECK (provider IN ('manual', 'meta_embedded'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
