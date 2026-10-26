# 08 Caching & Ops

## Caching — Decided

Language comes from a cookie, so one URL serves two languages. Pages are rendered fresh on each request; everything else is cached.

| What | How | Why |
| --- | --- | --- |
| HTML pages | Rendered per request, `Cache-Control: private, no-store` | Payload local API → D1 is fast. **Publishing is instant**: no cache to clear |
| Transformed images | Edge cache, 1 year, `?v={updatedAt}` | Replaced images get a new URL |
| JS, CSS, fonts, landing image, globe texture | Hashed filenames, cached permanently | Standard |
| Globe pins / upload detail | 60s | Approved pins appear within a minute; no purge logic |
| City search | 1 day | The data never changes |
| Quiz tag list | Comes with the quiz page | Always current |

If traffic ever spikes, add per-language page caching later. No data change needed.

## Analytics — Decided

Cloudflare Web Analytics. Free, no cookies, no consent banner.

## Fonts — Decided (base fonts, likely to change)

- Instrument Sans, Zen Kaku Gothic New, JetBrains Mono from Google Fonts, `display: swap`.
- Google Fonts splits the Japanese font so only the needed characters download.
- Font families are defined once (CSS variables / tokens) so swapping them later is a one-place change.

## Social previews — Decided

| Page | Title | Image |
| --- | --- | --- |
| Artwork | Artwork title (fallback "NARTIFA") | `og` size of the main image |
| Other pages | Page name · NARTIFA | Site-wide default image |

Description from i18n (Japanese, since crawlers get Japanese). Site-wide default image: supplied by the artist, placeholder for now.

## Logs and errors — Decided

- Workers logs only, enabled in the Cloudflare dashboard.
- Use a console-based logger (the template's), since Payload's default logger uses Node APIs that don't work in Workers.
- Log: failed uploads (reason, not content), Turnstile failures, rate-limit hits, image route errors.
- Never log IPs, photos or exact coordinates.

## Accessibility (from the design spec)

- `prefers-reduced-motion` respected everywhere (reveal fade, step transitions, globe auto-rotate).
- Focus outlines and keyboard support as in design spec 01 and 04.
- `lang` attributes correct per field (03).
