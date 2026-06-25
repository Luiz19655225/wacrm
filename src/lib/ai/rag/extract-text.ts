import { parseOffice } from 'officeparser'
import type { SupportedFileType } from './types'

// ------------------------------------------------------------
// Step 1 of the ingestion pipeline: turn an uploaded file's raw bytes
// into plain text. officeparser covers every binary format we accept
// (PDF/DOCX/PPTX/XLSX/CSV) — writing a parser for any of these by
// hand would be unreasonable, unlike the rest of this codebase's
// "no SDK, just fetch" house style for plain HTTP APIs. TXT needs no
// library at all.
// ------------------------------------------------------------

export interface ExtractTextResult {
  text: string
  charCount: number
  /** Only populated when the source format's AST exposes it (PDF/DOCX); null otherwise. */
  pageCount: number | null
}

export async function extractText(
  buffer: Buffer,
  fileType: SupportedFileType,
): Promise<ExtractTextResult> {
  if (fileType === 'txt') {
    const text = buffer.toString('utf-8')
    return { text, charCount: text.length, pageCount: null }
  }

  const ast = await parseOffice(buffer, { fileType })
  const { value } = await ast.to('text')
  const text = typeof value === 'string' ? value : ''
  const pageCount = typeof ast.metadata?.pages === 'number' ? ast.metadata.pages : null
  return { text, charCount: text.length, pageCount }
}
