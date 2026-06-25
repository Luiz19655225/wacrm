import type { SupportedFileType } from './types'

// ------------------------------------------------------------
// Maps an upload's MIME type (falling back to its extension) to one
// of the formats extractText/officeparser understands. Shared by the
// upload route (validation) and processDocument (extraction).
// ------------------------------------------------------------

// officeparser only understands the OOXML/modern formats (docx/pptx/
// xlsx) — it has no support for the legacy binary formats (.doc/.ppt/
// .xls). Mapping those to their modern counterpart would pass real
// OLE2 bytes into a parser expecting a zip/XML structure, which
// always fails: every legacy upload would silently waste a storage
// write and an API round trip just to land on `status: 'error'`.
// Rejecting them here instead, at validation time, fails fast with a
// clear message. (Verified against officeparser's exported
// `SupportedFileType` union — only 'docx' | 'pptx' | 'xlsx' | 'odt' |
// 'odp' | 'ods' | 'pdf' | 'rtf' | 'md' | 'html' | 'csv' exist.)
const MIME_TO_TYPE: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'text/plain': 'txt',
}

const EXTENSION_TO_TYPE: Record<string, SupportedFileType> = {
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx',
  xlsx: 'xlsx',
  csv: 'csv',
  txt: 'txt',
}

export function resolveFileType(mimeType: string, fileName: string): SupportedFileType | null {
  if (MIME_TO_TYPE[mimeType]) return MIME_TO_TYPE[mimeType]

  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension && EXTENSION_TO_TYPE[extension]) return EXTENSION_TO_TYPE[extension]

  return null
}
