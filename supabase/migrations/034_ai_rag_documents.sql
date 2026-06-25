-- ============================================================
-- 034_ai_rag_documents.sql
--
-- Fase 7 — Base de Conhecimento Inteligente (RAG).
--
-- Adds per-account document upload + semantic search on top of the
-- Fase 6 knowledge base (033). The AI keeps using the structured
-- sections (Perfil/Produtos/FAQ/Objetivos/Regras) exactly as before —
-- this is an ADDITIONAL layer: free-form documents (PDF/DOCX/PPTX/
-- XLSX/TXT) chunked and embedded, searched by similarity and folded
-- into the prompt as a new "Documentos relevantes" block.
--
-- This schema is intentionally generic about *where a document comes
-- from*. `source_type` exists so a future phase can add sources other
-- than a manual file upload (a URL/website crawl, a connected Drive/
-- OneDrive/Notion integration, an external knowledge API) without a
-- breaking migration — today only 'upload' is allowed; the CHECK
-- constraint widens later, nothing about ai_document_chunks or the
-- search function needs to change to support that.
--
-- `embedding_model` is stored per chunk (not assumed globally) so a
-- future re-embedding pass (model upgrade) can run incrementally and
-- mixed-model rows can coexist mid-migration. Nothing reads this
-- column yet beyond bookkeeping.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 0. pgvector extension
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. ai_documents — one row per uploaded document.
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload')),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_documents_account ON ai_documents(account_id, created_at);

ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;

-- Same sensitivity bar as the rest of the Fase 6 knowledge base
-- (ai_company_profile, ai_products, ...): any member can read what
-- the AI was trained on, only admin/owner can change it.
DROP POLICY IF EXISTS ai_documents_select ON ai_documents;
CREATE POLICY ai_documents_select ON ai_documents FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS ai_documents_insert ON ai_documents;
CREATE POLICY ai_documents_insert ON ai_documents FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_documents_update ON ai_documents;
CREATE POLICY ai_documents_update ON ai_documents FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS ai_documents_delete ON ai_documents;
CREATE POLICY ai_documents_delete ON ai_documents FOR DELETE USING (is_account_member(account_id, 'admin'));

DROP TRIGGER IF EXISTS set_updated_at ON ai_documents;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. ai_document_chunks — many rows per document, each with its own
-- embedding. Never read or written by the browser client — only the
-- service role (via the RAG module) touches this table, so RLS is
-- enabled with NO policies (default-deny for anon/authenticated;
-- service_role bypasses RLS entirely, same as every other admin-
-- client-only table in this project).
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_document ON ai_document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_account ON ai_document_chunks(account_id);

-- HNSW index for cosine-distance similarity search. Fine for the
-- account-scale this project runs at today; revisit (ivfflat + tuned
-- lists, or a coarser pre-filter) only if a single account's chunk
-- count grows enough to matter.
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_embedding
  ON ai_document_chunks USING hnsw (embedding vector_cosine_ops);

ALTER TABLE ai_document_chunks ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies — see comment above.

-- ============================================================
-- 3. match_ai_document_chunks — the only way anything queries
-- ai_document_chunks by similarity. Encapsulates the pgvector
-- distance operator so callers (the RAG module) never need to know
-- it exists; everything else talks to a plain function signature.
-- SECURITY DEFINER + explicit account_id filter because this runs via
-- the service role (which bypasses RLS) — the function itself is the
-- tenant boundary here, not a policy.
-- ============================================================
CREATE OR REPLACE FUNCTION match_ai_document_chunks(
  p_account_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM ai_document_chunks c
  WHERE c.account_id = p_account_id
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count
$$;

ALTER FUNCTION match_ai_document_chunks(UUID, VECTOR(1536), INTEGER) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION match_ai_document_chunks(UUID, VECTOR(1536), INTEGER) TO service_role;

-- ============================================================
-- 4. ai-knowledge-documents storage bucket — PRIVATE (unlike
-- chat-media/flow-media, which are public so Meta/the browser can
-- fetch them directly). These are confidential business documents;
-- only account members may read or write, and only admin/owner may
-- write, mirroring the table-level RLS above.
--
-- Path convention: ai-knowledge-documents/account-<account_id>/<uuid>.<ext>
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-knowledge-documents',
  'ai-knowledge-documents',
  FALSE,
  15728640, -- 15 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Members can read knowledge documents" ON storage.objects;
CREATE POLICY "Members can read knowledge documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ai-knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Admins can upload knowledge documents" ON storage.objects;
CREATE POLICY "Admins can upload knowledge documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
        AND p.account_role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can delete knowledge documents" ON storage.objects;
CREATE POLICY "Admins can delete knowledge documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ai-knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
        AND p.account_role IN ('admin', 'owner')
    )
  );
