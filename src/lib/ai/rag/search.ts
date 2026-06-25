import { supabaseAdmin } from '@/lib/ai/admin-client'
import { logAiUsage } from '@/lib/ai/ai-settings'
import { generateEmbeddings } from './embeddings'
import { logRagEvent } from './logger'
import type { RelevantChunk } from './types'

// ------------------------------------------------------------
// Step 5: semantic search. This is the ONLY function in the codebase
// that knows match_ai_document_chunks (the SQL function) exists — no
// route or component should ever call that RPC directly. Any future
// caller (an automation, a specialized agent, a public API, a new
// channel adapter) imports searchRelevantChunks and gets back plain
// text, nothing pgvector-shaped.
//
// Best-effort by design, same contract as getAccountKnowledgeBase
// (Fase 6): a missing OpenAI key, an empty knowledge base, or a
// database error must never break the caller's AI response — they
// all just degrade to "no relevant documents found".
// ------------------------------------------------------------

const DEFAULT_MATCH_COUNT = 5
// Hard cap on how much RAG content can ever enter a prompt, regardless
// of how many documents/chunks an account accumulates over time.
const MAX_TOTAL_CHARS = 6000

export async function searchRelevantChunks(
  accountId: string,
  apiKey: string,
  queryText: string,
  matchCount: number = DEFAULT_MATCH_COUNT,
): Promise<RelevantChunk[]> {
  const trimmedQuery = queryText.trim()
  if (!trimmedQuery) return []

  const startedAt = Date.now()
  try {
    const { embeddings } = await generateEmbeddings(apiKey, [trimmedQuery])
    const [queryEmbedding] = embeddings
    if (!queryEmbedding) return []

    const { data, error } = await supabaseAdmin().rpc('match_ai_document_chunks', {
      p_account_id: accountId,
      p_query_embedding: queryEmbedding,
      p_match_count: matchCount,
    })

    if (error || !data) return []

    let totalChars = 0
    const results: RelevantChunk[] = []
    for (const row of data as Array<{ document_id: string; content: string; similarity: number }>) {
      if (totalChars >= MAX_TOTAL_CHARS) break
      results.push({ documentId: row.document_id, content: row.content, similarity: row.similarity })
      totalChars += row.content.length
    }

    const durationMs = Date.now() - startedAt
    logRagEvent('search.completed', { accountId, durationMs, chunksReturned: results.length })
    // This is exactly the gap found during Fase 7's production
    // validation: without this row, there was no way to confirm from
    // logs/DB whether RAG search ran at all for a given reply.
    await logAiUsage({ accountId, feature: 'rag_search', durationMs, status: 'success' })

    return results
  } catch (err) {
    const durationMs = Date.now() - startedAt
    console.error('[rag] searchRelevantChunks failed (degrading to no documents):', err)
    logRagEvent('document.error', { accountId, stage: 'search', message: err instanceof Error ? err.message : String(err) })
    await logAiUsage({
      accountId,
      feature: 'rag_search',
      durationMs,
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Falha na busca RAG',
    })
    return []
  }
}
