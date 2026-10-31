import en from './en.json'
import ja from './ja.json'

// Admin field and option labels in both languages, read from the same i18n files as the site, so a
// word changed for the quiz changes in the admin too (Build Spec 07)
type Messages = { [key: string]: string | Messages }

const read = (messages: Messages, path: string): string | undefined => {
  let node: string | Messages | undefined = messages
  for (const part of path.split('.')) node = typeof node === 'object' ? node[part] : undefined
  return typeof node === 'string' ? node : undefined
}

// { en, ja } for Payload's label options. Missing English falls back to Japanese, like the site
export function adminLabel(path: string): { en: string; ja: string } {
  const jaText = read(ja, path)
  if (!jaText) throw new Error(`Missing Japanese i18n text for "${path}"`)
  return { en: read(en, path) ?? jaText, ja: jaText }
}

export type AdminLanguage = 'en' | 'ja'

// The admin's interface language as Payload reports it (anything but Japanese → English)
export const adminLanguage = (language: string | undefined): AdminLanguage => (language === 'ja' ? 'ja' : 'en')

// One string in the admin's language, with {name} placeholders filled in
export function adminText(path: string, language: string | undefined, vars: Record<string, string> = {}): string {
  const text = adminLabel(path)[adminLanguage(language)]
  return text.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match)
}
