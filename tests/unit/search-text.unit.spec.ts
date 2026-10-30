import { describe, expect, it } from 'vitest'

import { buildSearchText } from '@/lib/search-text'

describe('buildSearchText (Build Spec 07)', () => {
  it('joins both titles, lower-cased', () => {
    expect(buildSearchText(['夜の庭', 'Night Garden'])).toBe('夜の庭 night garden')
  })

  it('skips empty titles and trims', () => {
    expect(buildSearchText([null, undefined, '', '  Night Garden '])).toBe('night garden')
  })

  it('keeps one copy when both languages share a title', () => {
    expect(buildSearchText(['NARTIFA', 'nartifa'])).toBe('nartifa')
  })

  it('no titles → empty string', () => {
    expect(buildSearchText([])).toBe('')
  })
})
