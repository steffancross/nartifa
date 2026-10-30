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
| Incremental cache (page HTML + data) | R2: `r2IncrementalCache` | `NEXT_INC_CACHE_R2_BUCKET` → **the same bucket** as the originals, under `incremental-cache/` (OpenNext's default prefix) |
| Tag cache (on-demand clearing) | D1: `d1NextTagCache` | `NEXT_TAG_CACHE_D1` → **the same database** as Payload; one `revalidations` table (02) |
| Queue | **None** — only needed for time-based revalidation, which nothing uses | — (so no `WORKER_SELF_REFERENCE`, see 01) |

- **In the repo (2026-10-29):** `open-next.config.ts` sets exactly these two (`incrementalCache: r2IncrementalCache`, `tagCache: d1NextTagCache`).
- **`revalidations` is created by the deploy**, not by a migration: `opennextjs-cloudflare deploy` (and `preview`) runs `CREATE TABLE IF NOT EXISTS revalidations …` through `NEXT_TAG_CACHE_D1` while populating the cache.
- **Known issue (found 2026-10-30): every cached page reads as stale in OpenNext ≤ aws 4.1.13 / cloudflare 1.20.14.** Pages rendered on first visit aren't in the build's prerender manifest. Next 16.4 looks up a page's lifetime in (1) the cache entry's own `cacheControl`, (2) an in-memory map filled only in the Worker instance that rendered it, (3) the manifest, and otherwise assumes revalidate after 1 second. OpenNext stores `revalidate` in R2 but doesn't return it, and Workers instances don't share memory, so most visits are `x-nextjs-cache: STALE` and log "Failed to revalidate stale page … Dummy queue is not implemented". Visitors still get the cached copy, and saves still clear pages (the tag check runs first), so content is correct; the cost is an error log per visit.
  - Upstream: [opennextjs-aws#1250](https://github.com/opennextjs/opennextjs-aws/issues/1250), fixed by [#1317](https://github.com/opennextjs/opennextjs-aws/pull/1317) (merged 2026-10-29: `get()` returns the stored lifetime as `cacheControl`; needs Next ≥ 16.4.1). Not released yet; `@opennextjs/cloudflare` pins `@opennextjs/aws` exactly, so both need a new release.
  - **Not fixes:** adding a queue would re-render pages in the background on most visits, which is what the design avoids; prerendering via `generateStaticParams` only covers pages known at build time.
  - Check after upgrading: a second visit to `/` in each language returns `HIT`, and no "Failed to revalidate" in the logs.
- **Without a queue, a page must never become "stale".** If one did, OpenNext would try the (missing) queue, log an error and keep serving the old copy until the next save. Pages never go stale here: `revalidate = false`, and saves use `revalidateTag(tag, { expire: 0 })`, which makes the page a miss, not stale. The Phase 0 page-cache check confirms a save → next visit shows the new page.

No extra buckets or databases: the cache is two extra bindings to what already exists, and OpenNext manages its own contents. To reset the cache, delete the `incremental-cache/` prefix.

- Deploy with `opennextjs-cloudflare deploy` (not plain `wrangler deploy`); it populates the cache for the new version. After a deploy each page renders once on its first visit.
- Later, on the custom domain: wrap the incremental cache with `withRegionalCache(…, { mode: "long-lived" })` to keep hot pages in each data center. Optional; not needed at this traffic.
- **Never** cache HTML at the edge keyed by URL alone — the URL doesn't include the language. Worker responses are not edge-cached by default, so nothing to do as long as nobody turns it on. In particular: **don't enable Workers Cache** (`"cache": { "enabled": true }` in wrangler config). It covers the whole Worker, honors the cacheable headers Next.js puts on cached pages, and would serve one language to everyone (05).

A cache hit costs: middleware, one R2 read, one tag check in D1.

### Clearing — publishing stays instant

- All public reads go through `lib/data.ts`. Each function wraps a Payload local API call in `unstable_cache` with a tag. Pages inherit the tags of the data they use.
- **In the repo (2026-10-30):** `src/lib/data.ts` (example read `getMediaCount`, shown on the landing placeholder until Phase 3), tags in `src/lib/cache-tags.ts`, hooks from `revalidateOnChange(tag)` in `src/hooks/revalidate.ts`, attached to `media`. Tests: `tests/unit/revalidate-hook.unit.spec.ts` (calls `revalidateTag(tag, { expire: 0 })`, skips with `skipRevalidate`) and `tests/e2e/cache.e2e.spec.ts` (upload/delete through the API changes the count). `pnpm dev` refreshes caches on every request, so these prove the wiring, not the caching; that is the live check (checklist).
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
- **In the repo (2026-10-30):** `src/styles/fonts.ts` loads them with `next/font/google`: files are downloaded at build time and served from the site (browsers never contact Google). Zen Kaku Gothic New is weight 400 only with `preload: false`; Google's ~120 character-range slices are kept, so the browser fetches only the slices a page uses. 133 font files, 1.7 MB, all in static assets (not the Worker bundle). Exposed as `--font-latin`, `--font-ja`, `--font-mono`; `tokens.css` builds `--font-sans` from them.

## Social previews — Decided

| Page | Title | Image |
| --- | --- | --- |
| Artwork | Artwork title (fallback "NARTIFA") | `og` size of the main image |
| Other pages | Page name · NARTIFA | Site-wide default image |

Description from i18n (Japanese, since crawlers get Japanese). Site-wide default image: supplied by the artist, placeholder for now.

## Logs and errors — Decided

- Workers logs only, enabled by `"observability": { "enabled": true }` in `wrangler.jsonc` (so the go-live setup gets it too).
- Use a console-based logger (the template's), since Payload's default logger uses Node APIs that don't work in Workers.
- Log: failed uploads (reason, not content), Turnstile failures, rate-limit hits, image route errors.
- Never log IPs, photos or exact coordinates.

## Accessibility (from the design spec)

- `prefers-reduced-motion` respected everywhere (reveal fade, step transitions, globe auto-rotate).
- Focus outlines and keyboard support as in design spec 01 and 04.
- `lang` attributes correct per field (03).
