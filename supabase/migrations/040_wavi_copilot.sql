-- ============================================================
-- Migration 040 — Fase 9.0 WAVI Copilot
-- Aditiva: amplia o CHECK de features em ai_usage_logs para
-- incluir 'wavi_insights' (análise holística de conversa).
-- ============================================================

-- Wideia a constraint de features para incluir o novo tipo de
-- análise do WAVI Copilot. Padrão já usado na migration 035.
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_feature_check;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_feature_check
  CHECK (feature IN (
    'suggest_reply',
    'summarize',
    'classify_lead',
    'site_widget_reply',
    'connection_test',
    'rag_document_ingest',
    'rag_search',
    'wavi_insights'
  ));
