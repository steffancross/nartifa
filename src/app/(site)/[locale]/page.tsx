import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LanguageToggle } from '@/components/LanguageToggle'
import { getMediaCount } from '@/lib/data'

type Props = {
  params: Promise<{ locale: string }>
}

// Placeholder landing page until Phase 3 (design spec 02)
export default async function LandingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('landing')
  const mediaCount = await getMediaCount()

  return (
    <main>
      <h1>{t('heading')}</h1>
      <p>{t('placeholder')}</p>
      <p data-testid="media-count">{t('mediaCount', { count: mediaCount })}</p>
      <LanguageToggle />
    </main>
  )
}
