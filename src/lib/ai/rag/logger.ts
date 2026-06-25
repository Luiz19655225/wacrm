// ------------------------------------------------------------
// Structured observability for the RAG pipeline. Fase 7's production
// validation found a real gap: there was no way to confirm from
// Vercel logs whether searchRelevantChunks (or any ingestion step)
// actually ran for a given request. Every event here is one JSON
// line on stdout — greppable by `event` in `vercel logs` without any
// new infrastructure (no log aggregator, no DB table dedicated to
// this; ai_usage_logs already covers the metrics side, see search.ts
// and process-document.ts).
// ------------------------------------------------------------

export type RagLogEvent =
  | 'upload.started'
  | 'upload.completed'
  | 'upload.duplicate'
  | 'extract.completed'
  | 'embed.completed'
  | 'index.completed'
  | 'search.completed'
  | 'document.error'
  | 'document.deleted'

export function logRagEvent(event: RagLogEvent, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ scope: 'rag', event, ts: new Date().toISOString(), ...data }))
}
