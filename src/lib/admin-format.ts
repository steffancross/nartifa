import type { RequiredField } from '@/config/artworks'
import { adminText, adminLanguage } from '@/i18n/admin-labels'

// Text for the artworks table and form (Design Spec 09). Pure, so unit tested

// 22000 → "¥22,000"; empty → "On request" / "応相談"
export function formatPrice(price: number | null | undefined, language: string | undefined): string {
  if (price === null || price === undefined) return adminText('artwork.priceOnRequest', language)
  return `¥${price.toLocaleString('en-US')}`
}

// ["smell", "mainImage"] → "Smell, Main image" / "嗅覚、メイン画像", using the same words as the form
export function missingFieldNames(missing: readonly string[] | null | undefined, language: string | undefined): string {
  const lang = adminLanguage(language)
  const names = (missing ?? []).map((field) =>
    adminText(field === 'mainImage' ? 'admin.artworks.mainImage' : `quiz.senses.${field as RequiredField}`, lang),
  )
  return names.join(lang === 'ja' ? '、' : ', ')
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

// "3 days ago" / "3日前"; under a minute → "now" / "今"
export function relativeTime(date: string | Date, language: string | undefined, now: Date = new Date()): string {
  const format = new Intl.RelativeTimeFormat(adminLanguage(language), { numeric: 'auto' })
  const seconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit)
  }
  return format.format(0, 'second')
}

// Which where-filter is active for a field, e.g. { status: { equals: 'live' } } → 'live'. Looks
// through and/or too, since Payload's own filter panel rewrites the where in that shape. Values come
// back as strings, as they do from the URL (false → 'false')
export function equalsValue(where: unknown, field: string): string | undefined {
  if (!where || typeof where !== 'object') return undefined
  const node = where as Record<string, unknown>
  const condition = node[field] as { equals?: unknown } | undefined
  if (condition && ['string', 'boolean', 'number'].includes(typeof condition.equals)) return String(condition.equals)
  for (const key of ['and', 'or']) {
    for (const child of (node[key] as unknown[] | undefined) ?? []) {
      const found = equalsValue(child, field)
      if (found) return found
    }
  }
  return undefined
}
