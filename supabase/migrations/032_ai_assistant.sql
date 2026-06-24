-- ============================================================
-- 032_ai_assistant.sql
--
-- Fase 5 — Assistente IA (OpenAI) + atendente IA no site.
--
-- Key design decision: EVERY account brings its OWN OpenAI API key —
-- there is no global system key shared across customers. `ai_settings`
-- is therefore UNIQUE(account_id), same shape as `whatsapp_config`,
-- and the key is encrypted with the same AES-256-GCM helper
-- (src/lib/whatsapp/encryption.ts — already generic, not WhatsApp-
-- specific despite its folder name) used for whatsapp_config.access_token
-- and account_connections.credentials_encrypted. The key is never sent
-- back to the browser after save — only `api_key_last4` (non-secret)
-- is, so the UI can render "sk-...abcd" without decrypting anything.
--
-- `ai_usage_logs` is append-only observability for every OpenAI call
-- this phase makes (suggest reply / summarize / classify lead / site
-- widget reply) — the foundation Parte 3 of the spec asks for so a
-- future phase can add cost/token enforcement without a schema change.
--
-- `monthly_token_limit` / `auto_reply_enabled` / `business_hours_only`
-- on ai_settings are reserved columns for that same future phase —
-- present in the schema but NOT read or enforced by any code in this
-- migration's accompanying app code. Nothing in this phase sends an
-- automatic reply without a human clicking "send".
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. ai_settings — one row per account, holds the account's own
--    OpenAI credentials and assistant preferences.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- AES-256-GCM ciphertext (src/lib/whatsapp/encryption.ts). Never
  -- returned to the client.
  api_key_encrypted TEXT,
  -- Non-secret last 4 chars of the key, stored in plaintext purely so
  -- the UI can render "sk-...abcd" without ever decrypting the real
  -- key just to display a mask.
  api_key_last4 TEXT,

  default_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',

  -- Optional per-company tone/instructions, prepended to every
  -- suggest-reply / summarize / classify-lead / site-widget system
  -- prompt. Parte 3's "prompt personalizado por empresa", scoped to
  -- what's safely usable today (no automatic sending).
  custom_system_prompt TEXT,

  connection_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (connection_status IN ('not_configured', 'connected', 'error')),
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,

  -- Reserved for a future phase — not read or enforced anywhere yet.
  monthly_token_limit INTEGER,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  business_hours_only BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_id)
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Same posture as whatsapp_config: any account member can see that AI
-- is configured (and its non-secret fields); only admin+ can write,
-- since this governs a billable external API key for the whole account.
DROP POLICY IF EXISTS ai_settings_select ON ai_settings;
CREATE POLICY ai_settings_select ON ai_settings FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_settings_insert ON ai_settings;
CREATE POLICY ai_settings_insert ON ai_settings FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_settings_update ON ai_settings;
CREATE POLICY ai_settings_update ON ai_settings FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_settings_delete ON ai_settings;
CREATE POLICY ai_settings_delete ON ai_settings FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ai_usage_logs — append-only record of every OpenAI call made
--    on behalf of an account, across every feature. Service-role
--    only (writes always originate from API routes using the admin
--    client, same posture as automation_pending_executions).
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  feature TEXT NOT NULL
    CHECK (feature IN ('suggest_reply', 'summarize', 'classify_lead', 'site_widget_reply', 'connection_test')),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  model TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_account ON ai_usage_logs(account_id, created_at DESC);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_logs_select ON ai_usage_logs;
CREATE POLICY ai_usage_logs_select ON ai_usage_logs FOR SELECT USING (is_account_member(account_id));
-- No INSERT/UPDATE/DELETE policy for authenticated users — every write
-- goes through the service-role client from an API route.

-- ============================================================
-- 3. account_connections — widen the provider/type vocabulary so a
--    site-widget conversation can reuse the exact same connection_id
--    mechanism that already separates Meta vs Evolution threads,
--    instead of inventing a parallel "source" column. One SITE_WIDGET
--    connection row is auto-created (is_primary = false, so it never
--    competes with the account's real WhatsApp connection) the first
--    time the public widget endpoint is used for that account.
-- ============================================================
ALTER TABLE public.account_connections
  DROP CONSTRAINT IF EXISTS account_connections_type_check;
ALTER TABLE public.account_connections
  ADD CONSTRAINT account_connections_type_check
  CHECK (connection_type IN ('QR_CODE', 'META_API', 'SITE_WIDGET'));

ALTER TABLE public.account_connections
  DROP CONSTRAINT IF EXISTS account_connections_provider_check;
ALTER TABLE public.account_connections
  ADD CONSTRAINT account_connections_provider_check
  CHECK (provider IN ('EVOLUTION', 'META', 'SITE_WIDGET'));

ALTER TABLE public.account_connections
  DROP CONSTRAINT IF EXISTS account_connections_type_provider_pairing_check;
ALTER TABLE public.account_connections
  ADD CONSTRAINT account_connections_type_provider_pairing_check
  CHECK (
    (connection_type = 'QR_CODE' AND provider = 'EVOLUTION') OR
    (connection_type = 'META_API' AND provider = 'META') OR
    (connection_type = 'SITE_WIDGET' AND provider = 'SITE_WIDGET')
  );
