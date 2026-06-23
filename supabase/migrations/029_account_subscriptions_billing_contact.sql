-- ============================================================
-- 029_account_subscriptions_billing_contact
--
-- Phase 2 addition. Asaas requires a `cpfCnpj` to create a customer
-- (no PIX/boleto charge works without it) — neither `accounts` nor
-- `profiles` store a billing document or phone today. Rather than
-- reshape either of those tables, this adds three nullable columns
-- to `account_subscriptions`, the table that already owns every
-- other Asaas-shaped field (`asaas_customer_id`, `next_due_date`,
-- etc).
--
-- `billing_document_encrypted` / `billing_phone_encrypted` use the
-- same AES-256-GCM envelope as `whatsapp_config.access_token` /
-- `account_connections.credentials_encrypted`
-- (src/lib/whatsapp/encryption.ts) — a CPF/CNPJ is an identifying
-- document, not something to keep in plaintext next to the rest of
-- this table's columns (which any account viewer can already read).
-- `billing_name` stays plaintext: it's a display name, not a
-- document number.
--
-- Purely additive — no existing column, constraint, or policy here
-- is touched. Re-runnable: ADD COLUMN IF NOT EXISTS.
-- ============================================================

ALTER TABLE account_subscriptions
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_document_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone_encrypted TEXT;
