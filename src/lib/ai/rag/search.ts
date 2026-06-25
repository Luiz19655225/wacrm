import { supabaseAdmin } from '@/lib/ai/admin-client'
import { generateEmbeddings } from './embeddings'
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

  try {
    const [queryEmbedding] = await generateEmbeddings(apiKey, [trimmedQuery])
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
    return results
  } catch (err) {
    console.error('[rag] searchRelevantChunks failed (degrading to no documents):', err)
    return []
  }
}
