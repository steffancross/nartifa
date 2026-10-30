'use client'

import { useLocale, useTranslations } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'

// Switches language on the same URL. next-intl's router writes the `lang` cookie (1 year), then
// the page re-renders in place (Build Spec 03). Moves into the menu overlay later
export function LanguageToggle() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('language')

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: locale === 'ja' ? 'en' : 'ja' })}
    >
      {t('switchTo')}
    </button>
  )
}
