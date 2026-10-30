import { describe, expect, it } from 'vitest'

import { pickLanguage } from '@/i18n/accept-language'

describe('pickLanguage (Build Spec 03: only the first Accept-Language entry counts)', () => {
  it.each([
    ['ja', 'ja'],
    ['ja-JP', 'ja'],
    ['JA-jp,en;q=0.8', 'ja'],
    ['ja;q=0.9, en;q=0.8', 'ja'],
    ['en-US,en;q=0.9', 'en'],
    ['fr, ja', 'en'],
    ['ko-KR,ja;q=0.9', 'en'],
    ['jav', 'en'], // Javanese, not Japanese
  ])('%s → %s', (header, expected) => {
    expect(pickLanguage(header)).toBe(expected)
  })

  it.each([null, '', '   ', '*'])('no usable header (%j) → ja', (header) => {
    expect(pickLanguage(header)).toBe('ja')
  })
})
