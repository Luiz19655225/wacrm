// ------------------------------------------------------------
// Shared types for the RAG service. Kept separate from the rest of
// src/lib/ai/knowledge-base.ts on purpose — RAG (free-form documents)
// and the structured knowledge base (Fase 6) are two independent
// sources that happen to feed the same prompt, not one feature.
// ------------------------------------------------------------

export type SupportedFileType = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'txt'

export interface RelevantChunk {
  documentId: string
  content: string
  similarity: number
}
