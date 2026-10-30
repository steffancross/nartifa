// The visitor's top language decides: Japanese → 'ja', anything else → 'en', no header → 'ja'
// (Build Spec 03). next-intl on its own searches the whole list, so "fr, ja" would give 'ja'
export function pickLanguage(acceptLanguage: string | null): 'ja' | 'en' {
  const first = acceptLanguage?.split(',')[0]?.split(';')[0]?.trim().toLowerCase()
  if (!first || first === '*') return 'ja'
  return first === 'ja' || first.startsWith('ja-') ? 'ja' : 'en'
}
