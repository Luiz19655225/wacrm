import { supabaseAdmin } from '@/lib/ai/admin-client'
import { extractText } from './extract-text'
import { chunkText } from './chunk-text'
import { generateEmbeddings } from './embeddings'
import { storeChunks } from './store-chunks'
import type { SupportedFileType } from './types'

// ------------------------------------------------------------
// Orchestrates the full ingestion pipeline for one document:
// extractText -> chunkText -> generateEmbeddings -> storeChunks,
// then updates the ai_documents row's status. This is what the
// upload route calls — the route itself only handles the HTTP/auth/
// storage-upload concerns, none of the document-processing logic.
//
// Any failure marks the document 'error' with a readable message
// instead of leaving it stuck in 'processing' forever.
// ------------------------------------------------------------

interface ProcessDocumentArgs {
  accountId: string
  documentId: string
  buffer: Buffer
  fileType: SupportedFileType
  apiKey: string
}

export async function processDocument(args: ProcessDocumentArgs): Promise<void> {
  const { accountId, documentId, buffer, fileType, apiKey } = args
  const db = supabaseAdmin()

  try {
    const text = await extractText(buffer, fileType)
    const chunks = chunkText(text)

    if (chunks.length === 0) {
      await db
        .from('ai_documents')
        .update({ status: 'error', error_message: 'Não foi possível extrair texto deste arquivo.' })
        .eq('id', documentId)
      return
    }

    const embeddings = await generateEmbeddings(apiKey, chunks)
    await storeChunks(accountId, documentId, chunks, embeddings)

    await db
      .from('ai_documents')
      .update({ status: 'ready', error_message: null, chunk_count: chunks.length })
      .eq('id', documentId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao processar o documento.'
    console.error('[rag] processDocument failed:', err)
    await db.from('ai_documents').update({ status: 'error', error_message: message }).eq('id', documentId)
  }
}
