# 08 Caching & Ops

## Caching — Decided

Public pages are cached as finished HTML, **one copy per language**, and cleared the moment the artist saves. A normal page view never starts Payload or touches the artwork tables.

### One URL, two cached pages

- next-intl with `localePrefix: 'never'` (03). Middleware picks the language and rewrites `/works/12` internally to `/ja/works/12` or `/en/works/12`. Visitors never see the prefix.
- Public pages live under `app/(site)/[locale]/`. To Next.js each language is its own static route, so each is cached separately.
- Nothing is rendered at build time (the build has no database): `generateStaticParams` returns `[]` and `revalidate = false`. Each page is rendered on its first visit, then served from cache until cleared.
- Every layout and page calls next-intl's `setRequestLocale(locale)` (required for static rendering).
- **Pages under `[locale]` never read `cookies()`, `headers()` or `searchParams`.** Any of those makes the page render on every request again. Everything that depends on the visitor — quiz step, reveal state, scroll restore, the random tie pick — happens in the browser.

### Where the cache lives (OpenNext)

`open-next.config.ts`:

| Part | Choice | Bindings |
| --- | --- | --- |
| Incremental cache (page HTML + data) | R2: `r2IncrementalCache` | `NEXT_INC_CACHE_R2_BUCKET` → **the same bucket** as the originals, under `incremental-cache/` (OpenNext's default prefix). `WORKER_SELF_REFERENCE` |
| Tag cache (on-demand clearing) | D1: `d1NextTagCache` | `NEXT_TAG_CACHE_D1` → **the same database** as Payload; one `revalidations` table (02) |
| Queue | **None** — only needed for time-based revalidation, which nothing uses | — |

No extra buckets or databases: the cache is two extra bindings to what already exists, and OpenNext manages its own contents. To reset the cache, delete the `incremental-cache/` prefix.

- Deploy with `opennextjs-cloudflare deploy` (not plain `wrangler deploy`); it populates the cache for the new version. After a deploy each page renders once on its first visit.
- Later, on the custom domain: wrap the incremental cache with `withRegionalCache(…, { mode: "long-lived" })` to keep hot pages in each data center. Optional; not needed at this traffic.
- **Never** cache HTML at the edge keyed by URL alone — the URL doesn't include the language. Worker responses are not edge-cached by default, so nothing to do as long as nobody turns it on. In particular: **don't enable Workers Cache** (`"cache": { "enabled": true }` in wrangler config). It covers the whole Worker, honors the cacheable headers Next.js puts on cached pages, and would serve one language to everyone (05).

A cache hit costs: middleware, one R2 read, one tag check in D1.

### Clearing — publishing stays instant

- All public reads go through `lib/data.ts`. Each function wraps a Payload local API call in `unstable_cache` with a tag. Pages inherit the tags of the data they use.
- Two tags:
  - `works` — anything artwork-related: artwork pages, All Works, the quiz list, 404s for artwork ids.
  - `globe` — pins and upload details.
- Payload `afterChange` / `afterDelete` hooks call `revalidateTag(tag, { expire: 0 })`. In Next 16 that expires the tag at once, so the next visitor gets the new page. (`'max'`, the docs' default, would show the first visitor after a save the old page; `updateTag` only works in Server Actions.)
  - `artworks`, `media`, `series` → `works`
  - `globe-uploads`, `globe-photos` → `globe`
- Hooks skip revalidation when `req.context.skipRevalidate` is set. Scripts (`seed-admin`, imports) set it, since `revalidateTag` only works inside a Next.js request.
- One tag for all artworks is deliberate: a save clears every artwork page, but pages only re-render when next visited, and there are ~100. No per-page bookkeeping to get wrong.

### What runs where

| What | Cache | Cleared by |
| --- | --- | --- |
| HTML: landing, quiz, All Works, artwork, globe page, about, privacy, 404 | R2 page cache, per language | `works` tag (landing, globe page, about and privacy have no data — they only change on deploy) |
| Quiz tag list, All Works list | Inside their page | `works` tag |
| Globe pins / upload detail | Route handler runs each time; data from `unstable_cache` | `globe` tag — approved pins appear immediately |
| City search | `Cache-Control: public, max-age=86400`. Plain D1 query, no Payload | Never changes |
| Images (all sizes) | Made at upload, stored in R2, browser cache per 05. Each request runs the Worker for one R2 read | New `?v=` when an image is replaced |
| JS, CSS, fonts, landing image, globe texture | Hashed filenames, cached permanently | Deploy |

**Payload runs only for:** the admin, the first render of a page after a save or deploy, and visitor uploads (`POST`).

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
