import { describe, expect, it } from 'vitest'
import { chunkText } from './chunk-text'

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace-only input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n\n  ')).toEqual([])
  })

  it('keeps a short document as a single chunk', () => {
    const text = 'Parágrafo um.\n\nParágrafo dois.'
    expect(chunkText(text)).toEqual(['Parágrafo um.\n\nParágrafo dois.'])
  })

  it('packs paragraphs together until maxChars, then starts a new chunk', () => {
    const a = 'a'.repeat(50)
    const b = 'b'.repeat(50)
    const c = 'c'.repeat(50)
    const text = [a, b, c].join('\n\n')

    const chunks = chunkText(text, { maxChars: 110, overlapChars: 0 })
    expect(chunks).toEqual([`${a}\n\n${b}`, c])
  })

  it('hard-splits a single paragraph larger than maxChars', () => {
    const huge = 'x'.repeat(250)
    const chunks = chunkText(huge, { maxChars: 100, overlapChars: 0 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toContain('x'.repeat(50)) // no content silently dropped
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(100)
    }
  })

  it('repeats the tail of the previous chunk at the head of the next when overlap is set', () => {
    const a = 'a'.repeat(50)
    const b = 'b'.repeat(50)
    const c = 'c'.repeat(50)
    const text = [a, b, c].join('\n\n')

    const chunks = chunkText(text, { maxChars: 110, overlapChars: 10 })
    expect(chunks[0]).toBe(`${a}\n\n${b}`)
    expect(chunks[1]).toBe(`${'b'.repeat(10)}\n\n${c}`)
  })

  it('never produces an empty chunk', () => {
    const text = '\n\n\n  Parágrafo real.  \n\n\n'
    const chunks = chunkText(text)
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true)
  })
})
