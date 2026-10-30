import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import en from './en.json'
import ja from './ja.json'
import { routing } from './routing'

type Messages = { [key: string]: string | Messages }

// English messages on top of Japanese ones, so a missing English key shows Japanese (Build Spec 03)
const withFallback = (base: Messages, overrides: Messages): Messages => {
  const merged: Messages = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = base[key]
    merged[key] =
      typeof value === 'object' && typeof baseValue === 'object'
        ? withFallback(baseValue, value)
        : value
  }
  return merged
}

const messagesByLocale = { ja, en: withFallback(ja, en) }

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return { locale, messages: messagesByLocale[locale] }
})
