-- ============================================================
-- 030_evolution_connections
--
-- Phase 3: wires `account_connections` (foundation laid in
-- 028_account_connections.sql) to the real conversation pipeline
-- (`conversations` / `messages`) so a second provider (Evolution
-- API) can coexist with the live Meta Cloud API flow without
-- touching `whatsapp_config` or any Meta-specific row.
--
-- Three purely additive changes, no existing column/table altered:
--
-- 1. conversations.connection_id — nullable FK to
--    account_connections. Every conversation created by the
--    existing Meta webhook keeps connection_id = NULL (today's
--    behaviour, unchanged). Conversations created by the new
--    Evolution webhook set it to the originating connection, so a
--    contact can have separate conversation threads per channel
--    instead of colliding into one row.
--
-- 2. UNIQUE (provider, external_id) on account_connections — the
--    Evolution webhook resolves account_id by looking up
--    `external_id = payload.instance`. Without this constraint, a
--    retried instance-creation call could leave two rows with the
--    same external_id, breaking that lookup (the same class of bug
--    already seen once on this table with duplicate `pending`
--    rows — see Fase 2 notes in CLAUDE.md). Partial: META_API rows
--    have no external_id yet, so they're excluded.
--
-- 3. UNIQUE (conversation_id, message_id) on messages — Evolution's
--    inbound event is literally named MESSAGES_UPSERT, implying
--    retries/redelivery of the same event. Without this, a
--    redelivery would duplicate the message in the Inbox. The
--    Evolution webhook handler inserts with
--    ON CONFLICT (conversation_id, message_id) DO NOTHING. This
--    never affects the Meta path: message_id there is unique by
--    construction and the index is partial (message_id IS NOT
--    NULL), so agent-sent messages awaiting a wamid are unaffected.
--
-- Re-runnable by design, same posture as every migration since
-- 024_billing_plans.sql.
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.account_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_connection ON public.conversations(connection_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_connections_provider_external_id
  ON public.account_connections(provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conversation_message_id
  ON public.messages(conversation_id, message_id)
  WHERE message_id IS NOT NULL;
