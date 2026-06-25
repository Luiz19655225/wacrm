// ------------------------------------------------------------
// Public API of the RAG (Retrieval-Augmented Generation) service.
//
// This module is intentionally decoupled from the Inbox and from any
// specific channel. It answers one question — "what has this account
// taught the AI through uploaded documents that's relevant right
// now?" — and nothing here assumes who's asking. The Inbox assistant
// and the public site widget are today's two callers, but an
// automation step, a specialized agent, a future public API, or a
// future channel (Instagram/Telegram/Messenger/E-mail) would import
// from here exactly the same way: searchRelevantChunks() in,
// buildRagPromptBlock() to render, done.
//
// Today's source of documents is manual upload (processDocument,
// driven by /api/ai/knowledge-documents). ai_documents.source_type
// (see migration 034) exists so a future phase can add other sources
// — a crawled URL, a connected Drive/OneDrive/Notion integration, an
// external API — without changing anything below this comment: they
// would all still end up as rows in ai_document_chunks, searched the
// exact same way.
//
// Explicitly out of scope for this phase (do not add speculatively):
// OCR, background jobs/queues, document versioning, hybrid/re-ranked
// search, multi-model embeddings, white-label/multi-tenant document
// sharing. See CLAUDE.md "Fase 7" for the full list.
// ------------------------------------------------------------

export { processDocument } from './process-document'
export { searchRelevantChunks } from './search'
export { buildRagPromptBlock } from './prompt-block'
export { resolveFileType } from './file-type'
export { chunkText } from './chunk-text'
export { extractText } from './extract-text'
export type { ExtractTextResult } from './extract-text'
export { generateEmbeddings, EMBEDDING_MODEL } from './embeddings'
export { hashFileContent, findDuplicateDocument } from './duplicate-check'
export type { DuplicateDocument } from './duplicate-check'
export { logRagEvent } from './logger'
export type { RagLogEvent } from './logger'
export type { RelevantChunk, SupportedFileType } from './types'
