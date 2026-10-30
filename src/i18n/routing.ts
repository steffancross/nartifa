import { defineRouting } from 'next-intl/routing'

// The language is never in the URL: proxy.ts rewrites /works/12 to the hidden [locale] folder,
// so each language is cached as its own page (Build Spec 03, 08)
export const routing = defineRouting({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localePrefix: 'never',
  localeCookie: { name: 'lang', maxAge: 60 * 60 * 24 * 365 },
})
