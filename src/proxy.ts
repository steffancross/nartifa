import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'

import { pickLanguage } from './i18n/accept-language'
import { routing } from './i18n/routing'

const handleI18n = createMiddleware(routing)

// Next 16's name for middleware (Build Spec 03). The `lang` cookie still wins inside next-intl;
// without one, only the first Accept-Language entry counts
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('accept-language', pickLanguage(request.headers.get('accept-language')))
  return handleI18n(new NextRequest(request, { headers }))
}

export const config = {
  // Payload (/admin, /api), the image route (/img), Next's own files and anything with an
  // extension never pass through here
  matcher: ['/((?!(?:admin|api|img|_next)(?:/|$)|.*\\..*).*)'],
}
