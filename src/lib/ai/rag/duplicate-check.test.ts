import { describe, expect, it } from 'vitest'
import { hashFileContent } from './duplicate-check'

describe('hashFileContent', () => {
  it('is deterministic for the same content', () => {
    const buffer = Buffer.from('mesmo conteúdo')
    expect(hashFileContent(buffer)).toBe(hashFileContent(Buffer.from('mesmo conteúdo')))
  })

  it('differs for different content', () => {
    const a = hashFileContent(Buffer.from('conteúdo A'))
    const b = hashFileContent(Buffer.from('conteúdo B'))
    expect(a).not.toBe(b)
  })

  it('returns a 64-char hex sha256 digest', () => {
    const hash = hashFileContent(Buffer.from('qualquer coisa'))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})
