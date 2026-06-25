// ------------------------------------------------------------
// Step 2 of the ingestion pipeline: split extracted text into chunks
// small enough to embed and retrieve meaningfully, with a little
// overlap so a sentence split across a chunk boundary doesn't lose
// context entirely. Character-based (no tokenizer dependency) — fine
// for the document sizes this feature targets (catalogs, manuals,
// contracts), not optimized for token-exact budgets.
// ------------------------------------------------------------

const DEFAULT_MAX_CHARS = 1800
const DEFAULT_OVERLAP_CHARS = 200

export interface ChunkTextOptions {
  maxChars?: number
  overlapChars?: number
}

/**
 * Splits on paragraph breaks first, then greedily packs paragraphs
 * into chunks up to `maxChars`. A single paragraph longer than
 * `maxChars` on its own is hard-split. Empty/whitespace-only input
 * returns no chunks.
 */
export function chunkText(text: string, options: ChunkTextOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return []

  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
  }

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph

    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    flush()

    if (paragraph.length <= maxChars) {
      current = paragraph
      continue
    }

    // Single paragraph bigger than maxChars on its own — hard-split it.
    let rest = paragraph
    while (rest.length > maxChars) {
      chunks.push(rest.slice(0, maxChars))
      rest = rest.slice(maxChars - overlapChars)
    }
    current = rest
  }

  flush()

  if (overlapChars <= 0 || chunks.length < 2) return chunks

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk
    const prevTail = chunks[i - 1].slice(-overlapChars)
    return `${prevTail}\n\n${chunk}`
  })
}
