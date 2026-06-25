import type { SupportedFileType } from './types'

// ------------------------------------------------------------
// Maps an upload's MIME type (falling back to its extension) to one
// of the formats extractText/officeparser understands. Shared by the
// upload route (validation) and processDocument (extraction).
// ------------------------------------------------------------

const MIME_TO_TYPE: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'application/msword': 'docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'pptx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'text/plain': 'txt',
}

const EXTENSION_TO_TYPE: Record<string, SupportedFileType> = {
  pdf: 'pdf',
  doc: 'docx',
  docx: 'docx',
  ppt: 'pptx',
  pptx: 'pptx',
  xls: 'xlsx',
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
