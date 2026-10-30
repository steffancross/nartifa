import { notFound } from 'next/navigation'

// proxy.ts sends every public path into [locale], so /foo arrives as /ja/foo. Anything that
// isn't a real page lands here and gets the localized not-found page (Build Spec 03)
export default function CatchAll() {
  notFound()
}
