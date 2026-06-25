import { describe, expect, it } from 'vitest'
import { resolveFileType } from './file-type'

describe('resolveFileType', () => {
  it('resolves every accepted MIME type', () => {
    expect(resolveFileType('application/pdf', 'doc.pdf')).toBe('pdf')
    expect(
      resolveFileType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc.docx',
      ),
    ).toBe('docx')
    expect(
      resolveFileType(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'doc.pptx',
      ),
    ).toBe('pptx')
    expect(
      resolveFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'doc.xlsx'),
    ).toBe('xlsx')
    expect(resolveFileType('text/csv', 'doc.csv')).toBe('csv')
    expect(resolveFileType('text/plain', 'doc.txt')).toBe('txt')
  })

  it('falls back to the file extension when the MIME type is unrecognized', () => {
    expect(resolveFileType('application/octet-stream', 'relatorio.pdf')).toBe('pdf')
    expect(resolveFileType('application/octet-stream', 'planilha.xlsx')).toBe('xlsx')
  })

  it('rejects legacy binary Office formats not supported by officeparser', () => {
    expect(resolveFileType('application/msword', 'antigo.doc')).toBeNull()
    expect(resolveFileType('application/vnd.ms-powerpoint', 'antigo.ppt')).toBeNull()
    expect(resolveFileType('application/vnd.ms-excel', 'antigo.xls')).toBeNull()
  })

  it('rejects unsupported or unknown extensions', () => {
    expect(resolveFileType('application/zip', 'arquivo.zip')).toBeNull()
    expect(resolveFileType('', 'sem-extensao')).toBeNull()
  })
})
