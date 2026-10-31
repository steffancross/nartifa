import { describe, expect, it } from 'vitest'

import { adminText } from '@/i18n/admin-labels'
import { equalsValue, formatPrice, missingFieldNames, relativeTime } from '@/lib/admin-format'
import { validateWholeYen, validateYear } from '@/lib/validation'

describe('formatPrice (Design Spec 09)', () => {
  it('yen with commas', () => {
    expect(formatPrice(22000, 'en')).toBe('¥22,000')
    expect(formatPrice(0, 'ja')).toBe('¥0')
  })

  it('empty → on request, in the admin language', () => {
    expect(formatPrice(null, 'en')).toBe('On request')
    expect(formatPrice(undefined, 'ja')).toBe('応相談')
  })
})

describe('missingFieldNames', () => {
  it('uses the form words, joined per language', () => {
    expect(missingFieldNames(['smell', 'feeling', 'mainImage'], 'en')).toBe('Smell, Feeling, Main image')
    expect(missingFieldNames(['smell', 'mainImage'], 'ja')).toBe('嗅覚、メイン画像')
  })

  it('nothing missing → empty', () => {
    expect(missingFieldNames([], 'en')).toBe('')
    expect(missingFieldNames(null, 'en')).toBe('')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-10-30T12:00:00Z')

  it.each([
    ['2026-10-30T11:59:30Z', 'en', 'now'],
    ['2026-10-30T11:55:00Z', 'en', '5 minutes ago'],
    ['2026-10-27T12:00:00Z', 'en', '3 days ago'],
    ['2026-10-29T12:00:00Z', 'en', 'yesterday'],
    ['2026-10-27T12:00:00Z', 'ja', '3 日前'],
    ['2025-10-30T12:00:00Z', 'en', 'last year'],
  ])('%s (%s) → %s', (date, language, expected) => {
    expect(relativeTime(date, language, now)).toBe(expected)
  })
})

describe('equalsValue', () => {
  it('reads a plain filter and one nested by the filter panel', () => {
    expect(equalsValue({ status: { equals: 'live' } }, 'status')).toBe('live')
    expect(equalsValue({ or: [{ and: [{ status: { equals: 'hidden' } }] }] }, 'status')).toBe('hidden')
    expect(equalsValue({}, 'status')).toBeUndefined()
    expect(equalsValue(undefined, 'status')).toBeUndefined()
  })
})

describe('adminText', () => {
  it('fills placeholders', () => {
    expect(adminText('admin.artworks.note.incomplete', 'en', { fields: 'Smell' })).toBe("Can't be shown yet. Needs: Smell")
    expect(adminText('admin.artworks.note.incomplete', 'ja', { fields: '嗅覚' })).toBe('まだ表示できません。未入力：嗅覚')
  })
})

describe('form validation', () => {
  const req = (language: string) => ({ req: { i18n: { language } } }) as never

  it('price: empty or a whole number of yen', () => {
    expect(validateWholeYen(null, req('en'))).toBe(true)
    expect(validateWholeYen(22000, req('en'))).toBe(true)
    expect(validateWholeYen(0, req('en'))).toBe(true)
    expect(validateWholeYen(22000.5, req('en'))).toMatch(/whole number/)
    expect(validateWholeYen(-1, req('ja'))).toMatch(/整数/)
  })

  it('year: empty or 4 digits', () => {
    expect(validateYear(undefined, req('en'))).toBe(true)
    expect(validateYear(2026, req('en'))).toBe(true)
    expect(validateYear(26, req('en'))).toMatch(/4-digit/)
    expect(validateYear(20260, req('ja'))).toMatch(/4桁/)
  })
})
