import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { routing } from '@/i18n/routing'
import { fontVariables } from '@/styles/fonts'
import '@/styles/tokens.css'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

// Nothing renders at build time (the build has no database). Each page renders on its first
// visit, then is served from the page cache until a save clears it (Build Spec 08)
export const revalidate = false
export function generateStaticParams(): { locale: string }[] {
  return []
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return { title: t('title') }
}

// Root layout for the public site. Pages under [locale] never read cookies(), headers() or
// searchParams, so they stay static (Build Spec 00, convention 6)
export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
