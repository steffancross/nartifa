import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'

// Any unknown public URL, in the visitor's language (Build Spec 03, Unavailable works)
export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <main>
      <h1>{t('title')}</h1>
      <Link href="/">{t('home')}</Link>
    </main>
  )
}
