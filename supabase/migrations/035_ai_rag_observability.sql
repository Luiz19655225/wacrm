-- ============================================================
-- 035_ai_rag_observability.sql
--
-- Fase 7.1 — Estabilização do RAG.
--
-- Purely additive on top of 034_ai_rag_documents.sql. The Fase 7
-- validation found two real gaps: the UI only ever showed a single
-- "Processando" state (no real progress), and there was no way to
-- confirm from logs/DB whether searchRelevantChunks actually ran.
-- This migration adds the columns needed to fix both, plus enough
-- bookkeeping (char/page/token counts, processing duration, a content
-- hash for duplicate detection) to size and cost future plans. No
-- architecture change — same tables, same RLS posture as 034.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. ai_documents — granular status + metadata.
--
-- 'extracting'/'embedding'/'indexing' are new transitional states
-- between the upload responding and the document reaching 'ready' or
-- 'error'. Existing rows (status 'processing'/'ready'/'error') stay
-- valid — 'processing' itself is not removed from the CHECK, just no
-- longer written by new code (kept so any in-flight row at deploy
-- time still satisfies the constraint).
-- ============================================================
ALTER TABLE ai_documents
  DROP CONSTRAINT IF EXISTS ai_documents_status_check;
ALTER TABLE ai_documents
  ADD CONSTRAINT ai_documents_status_check
  CHECK (status IN ('processing', 'extracting', 'embedding', 'indexing', 'ready', 'error'));

ALTER TABLE ai_documents
  ADD COLUMN IF NOT EXISTS char_count INTEGER,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS embedding_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER,
  -- SHA-256 hex digest of the raw file bytes. Used only to DETECT and
  -- SURFACE a possible duplicate to the user — never to block or
  -- silently dedupe automatically (that decision belongs to whoever
  -- uploads, see the upload route / UI dialog). No UNIQUE constraint
  -- on purpose: a deliberate "enviar mesmo assim" must succeed.
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_documents_account_hash ON ai_documents(account_id, content_hash);

-- ============================================================
-- 2. ai_usage_logs — widen `feature` so RAG ingestion and RAG search
-- write to the SAME append-only observability table Fase 5 already
-- built, instead of a new metrics table. `duration_ms` is generic
-- enough to record both "how long did extraction+embedding take" and
-- "how long did this similarity search take".
-- ============================================================
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_feature_check;
ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_feature_check
  CHECK (feature IN (
    'suggest_reply', 'summarize', 'classify_lead', 'site_widget_reply', 'connection_test',
    'rag_document_ingest', 'rag_search'
  ));

ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
