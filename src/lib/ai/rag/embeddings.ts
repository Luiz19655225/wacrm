import { createOpenAIEmbeddings } from '@/lib/ai/openai-client'

// ------------------------------------------------------------
// Step 3 of the ingestion pipeline (also used standalone to embed a
// search query). This is the RAG-domain wrapper, not the HTTP call
// itself — the actual fetch to OpenAI lives in openai-client.ts,
// which every AI feature in this codebase shares. This module only
// owns the batching decision (how many texts per request) and the
// model name, so a future re-embedding pass or model upgrade changes
// one constant here, not every call site.
// ------------------------------------------------------------

export const EMBEDDING_MODEL = 'text-embedding-3-small'

const BATCH_SIZE = 96

export interface GenerateEmbeddingsResult {
  embeddings: number[][]
  totalTokens: number
}

export async function generateEmbeddings(
  apiKey: string,
  texts: string[],
): Promise<GenerateEmbeddingsResult> {
  if (texts.length === 0) return { embeddings: [], totalTokens: 0 }

  const results: number[][] = []
  let totalTokens = 0
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const batchResult = await createOpenAIEmbeddings(apiKey, EMBEDDING_MODEL, batch)
    results.push(...batchResult.embeddings)
    totalTokens += batchResult.totalTokens
  }
  return { embeddings: results, totalTokens }
}
