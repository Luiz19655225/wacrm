-- ============================================================
-- 031_quick_replies.sql
--
-- "Respostas rápidas" — canned text snippets an agent inserts into the
-- Inbox composer via a "/shortcut" trigger (e.g. "/pix", "/obrigado").
-- The composer hint ("Digite '/' para respostas rápidas") already
-- existed in the UI with no feature behind it — this migration adds
-- the missing table.
--
-- Deliberately NOT the existing `message_templates` table: those are
-- Meta-approved WhatsApp Business HSM templates (need Meta approval,
-- language codes, variable params) and can't be sent at all on
-- Evolution/Baileys-connected accounts. Quick replies are plain text,
-- inserted into the composer and sent through the normal text-send
-- path, so they work identically on every provider.
--
-- Account-scoped, same RLS shape as `tags`/`contacts` (017): any
-- account member can read; agent+ can create/edit/delete, since these
-- are day-to-day operational snippets for whoever is answering chats,
-- not structural account config.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_account ON quick_replies(account_id);

ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quick_replies_select ON quick_replies;
CREATE POLICY quick_replies_select ON quick_replies FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS quick_replies_insert ON quick_replies;
CREATE POLICY quick_replies_insert ON quick_replies FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS quick_replies_update ON quick_replies;
CREATE POLICY quick_replies_update ON quick_replies FOR UPDATE USING (is_account_member(account_id, 'agent'));

DROP POLICY IF EXISTS quick_replies_delete ON quick_replies;
CREATE POLICY quick_replies_delete ON quick_replies FOR DELETE USING (is_account_member(account_id, 'agent'));
