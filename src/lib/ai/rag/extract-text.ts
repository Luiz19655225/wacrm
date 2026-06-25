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

export async function extractText(buffer: Buffer, fileType: SupportedFileType): Promise<string> {
  if (fileType === 'txt') {
    return buffer.toString('utf-8')
  }

  const ast = await parseOffice(buffer, { fileType })
  const { value } = await ast.to('text')
  return typeof value === 'string' ? value : ''
}
