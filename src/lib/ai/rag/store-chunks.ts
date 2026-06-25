import { supabaseAdmin } from '@/lib/ai/admin-client'
import { EMBEDDING_MODEL } from './embeddings'

// ------------------------------------------------------------
// Step 4 of the ingestion pipeline: persist chunks + their embeddings.
// Always via the service role — ai_document_chunks has no RLS
// policies at all (see migration 034), so only this module ever
// writes to it.
// ------------------------------------------------------------

export async function storeChunks(
  accountId: string,
  documentId: string,
  chunks: string[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error('storeChunks: chunks and embeddings length mismatch')
  }
  if (chunks.length === 0) return

  const rows = chunks.map((content, index) => ({
    account_id: accountId,
    document_id: documentId,
    chunk_index: index,
    content,
    embedding: embeddings[index],
    embedding_model: EMBEDDING_MODEL,
  }))

  const { error } = await supabaseAdmin().from('ai_document_chunks').insert(rows)
  if (error) {
    throw new Error(`Falha ao salvar os trechos do documento: ${error.message}`)
  }
}
