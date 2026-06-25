import { describe, expect, it, vi } from 'vitest'
import { extractText } from './extract-text'

vi.mock('officeparser', () => ({
  parseOffice: vi.fn(),
}))

import { parseOffice } from 'officeparser'

describe('extractText', () => {
  it('reads txt directly, no officeparser involved', async () => {
    const result = await extractText(Buffer.from('Olá mundo'), 'txt')
    expect(result).toEqual({ text: 'Olá mundo', charCount: 9, pageCount: null })
    expect(parseOffice).not.toHaveBeenCalled()
  })

  it('extracts text and page count for a PDF via officeparser', async () => {
    vi.mocked(parseOffice).mockResolvedValue({
      metadata: { pages: 3 },
      to: vi.fn().mockResolvedValue({ value: 'conteúdo do pdf', messages: [] }),
    } as never)

    const result = await extractText(Buffer.from('%PDF-fake'), 'pdf')
    expect(result.text).toBe('conteúdo do pdf')
    expect(result.charCount).toBe('conteúdo do pdf'.length)
    expect(result.pageCount).toBe(3)
  })

  it('returns null pageCount when the format does not expose page metadata (DOCX)', async () => {
    vi.mocked(parseOffice).mockResolvedValue({
      metadata: {},
      to: vi.fn().mockResolvedValue({ value: 'conteúdo do docx', messages: [] }),
    } as never)

    const result = await extractText(Buffer.from('PK-fake'), 'docx')
    expect(result.pageCount).toBeNull()
  })

  it('returns empty text (not a throw) when the AST conversion yields no string value', async () => {
    vi.mocked(parseOffice).mockResolvedValue({
      metadata: {},
      to: vi.fn().mockResolvedValue({ value: undefined, messages: [] }),
    } as never)

    const result = await extractText(Buffer.from('fake'), 'pptx')
    expect(result).toEqual({ text: '', charCount: 0, pageCount: null })
  })
})
