import { supabaseAdmin } from '@/lib/ai/admin-client'
import { logAiUsage } from '@/lib/ai/ai-settings'
import { OpenAIRequestError } from '@/lib/ai/openai-client'
import { extractText } from './extract-text'
import { chunkText } from './chunk-text'
import { generateEmbeddings, EMBEDDING_MODEL } from './embeddings'
import { storeChunks } from './store-chunks'
import { logRagEvent } from './logger'
import type { SupportedFileType } from './types'

// ------------------------------------------------------------
// Orchestrates the full ingestion pipeline for one document:
// extractText -> chunkText -> generateEmbeddings -> storeChunks,
// then updates the ai_documents row's status. This is what the
// upload route calls — the route itself only handles the HTTP/auth/
// storage-upload concerns, none of the document-processing logic.
//
// Fase 7.1: the row's `status` is now updated at each stage
// (extracting -> embedding -> indexing -> ready) instead of jumping
// straight from 'processing' to 'ready', so the UI can show real
// progress instead of a single spinner. Any failure marks the
// document 'error' with a SPECIFIC message instead of leaving it
// stuck mid-pipeline forever or showing a generic "failed" string.
// ------------------------------------------------------------

interface ProcessDocumentArgs {
  accountId: string
  documentId: string
  buffer: Buffer
  fileType: SupportedFileType
  apiKey: string
}

/** A temporary OpenAI failure (rate limit / server error) is worth a "tente novamente"; anything else isn't. */
function isRetryableOpenAIFailure(err: unknown): boolean {
  return err instanceof OpenAIRequestError && (err.status === 429 || err.status >= 500)
}

export async function processDocument(args: ProcessDocumentArgs): Promise<void> {
  const { accountId, documentId, buffer, fileType, apiKey } = args
  const db = supabaseAdmin()
  const startedAt = Date.now()

  async function fail(stage: string, message: string): Promise<void> {
    logRagEvent('document.error', { accountId, documentId, stage, message })
    await logAiUsage({
      accountId,
      feature: 'rag_document_ingest',
      durationMs: Date.now() - startedAt,
      status: 'error',
      errorMessage: message,
    })
    await db.from('ai_documents').update({ status: 'error', error_message: message }).eq('id', documentId)
  }

  try {
    await db.from('ai_documents').update({ status: 'extracting' }).eq('id', documentId)

    let extracted
    try {
      extracted = await extractText(buffer, fileType)
    } catch (err) {
      console.error('[rag] extractText failed:', err)
      await fail('extract', 'Não foi possível extrair texto deste arquivo. Verifique se ele não está corrompido.')
      return
    }

    const chunks = chunkText(extracted.text)
    if (chunks.length === 0) {
      await fail('extract', 'O documento está vazio ou não contém texto que possa ser extraído.')
      return
    }

    logRagEvent('extract.completed', {
      accountId,
      documentId,
      durationMs: Date.now() - startedAt,
      charCount: extracted.charCount,
      pageCount: extracted.pageCount,
      chunkCount: chunks.length,
    })

    await db
      .from('ai_documents')
      .update({ status: 'embedding', char_count: extracted.charCount, page_count: extracted.pageCount })
      .eq('id', documentId)

    const embedStartedAt = Date.now()
    let embeddings: number[][]
    let totalTokens = 0
    try {
      const result = await generateEmbeddings(apiKey, chunks)
      embeddings = result.embeddings
      totalTokens = result.totalTokens
    } catch (err) {
      console.error('[rag] generateEmbeddings failed:', err)
      const message = isRetryableOpenAIFailure(err)
        ? 'Falha temporária ao gerar embeddings na OpenAI. Tente enviar o documento novamente em alguns minutos.'
        : err instanceof Error
          ? `Falha ao gerar embeddings: ${err.message}`
          : 'Falha ao gerar embeddings do documento.'
      await fail('embed', message)
      return
    }

    logRagEvent('embed.completed', {
      accountId,
      documentId,
      durationMs: Date.now() - embedStartedAt,
      tokens: totalTokens,
      chunkCount: chunks.length,
    })

    await db.from('ai_documents').update({ status: 'indexing' }).eq('id', documentId)

    const indexStartedAt = Date.now()
    try {
      await storeChunks(accountId, documentId, chunks, embeddings)
    } catch (err) {
      console.error('[rag] storeChunks failed:', err)
      const message = err instanceof Error ? err.message : 'Falha ao indexar os trechos do documento.'
      await fail('index', message)
      return
    }

    logRagEvent('index.completed', { accountId, documentId, durationMs: Date.now() - indexStartedAt })

    const processingDurationMs = Date.now() - startedAt

    await db
      .from('ai_documents')
      .update({
        status: 'ready',
        error_message: null,
        chunk_count: chunks.length,
        embedding_model: EMBEDDING_MODEL,
        embedding_tokens: totalTokens,
        processing_duration_ms: processingDurationMs,
      })
      .eq('id', documentId)

    await logAiUsage({
      accountId,
      feature: 'rag_document_ingest',
      model: EMBEDDING_MODEL,
      durationMs: processingDurationMs,
      status: 'success',
    })
  } catch (err) {
    // Catch-all for anything not already handled above (e.g. the
    // initial status update itself failing) — still never leaves the
    // row stuck, just with a generic message since the specific stage
    // is unknown here.
    console.error('[rag] processDocument failed unexpectedly:', err)
    await fail('unknown', err instanceof Error ? err.message : 'Falha ao processar o documento.')
  }
}
