import type { RelevantChunk } from './types'

// ------------------------------------------------------------
// Pure formatting — no IO. Renders whatever searchRelevantChunks found
// as a pt-BR prompt section. Returns '' when there's nothing to show
// (no documents yet, or no chunk was relevant enough), so callers can
// drop it from the instructions array the same way every other
// optional knowledge-base section already does.
// ------------------------------------------------------------

export function buildRagPromptBlock(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) return ''

  const lines = chunks.map((c) => `- ${c.content}`)
  return `## Documentos relevantes\n${lines.join('\n\n')}`
}
