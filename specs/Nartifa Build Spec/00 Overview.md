# NARTIFA — Build Spec: Overview

Version 1 · 2026-10-25 · For the developer building the site. Read alongside the *Design Spec*.

The design spec says what each page looks like and how it behaves. This spec says how it is built: platform, data, logic and infrastructure. Page numbers (05, 07, 10a…) refer to the design spec. When the two disagree, raise it — don't guess.

## Files

| File | Covers |
| --- | --- |
| 00 Overview.md | This file — stack, architecture, conventions, changes to the design spec |
| 01 Platform.md | Hosting, accounts, costs, secrets, auth, deploy |
| 02 Data Model.md | Collections, fields, statuses, indexes |
| 03 Routing & i18n.md | URLs, language selection, fallback, quiz history, reveal state |
| 04 Matching.md | Quiz scoring, ties, where it runs, how to change it |
| 05 Images.md | Storage, sizes, transforms, privacy, alt text |
| 06 Globe.md | three.js build, pins, city search, upload flow, limits and spam |
| 07 Admin.md | Stock Payload vs custom, each admin screen |
| 08 Caching & Ops.md | Caching, analytics, fonts, social previews, logs |
| 09 Build Order.md | Phases, what to verify early, open items |
| ../NARTIFA Build Checklist.md | The same phases as tick boxes, for tracking progress |

## Status labels

Same as the design spec:
- **Decided** — build as written.
- **Proposed** — build it, keep it easy to change.
- **Deferred** — not in v1.
- **Verify** — a technical assumption to confirm early in the build (listed together in 09).

## Stack — Decided

| Layer | Choice |
| --- | --- |
| Hosting | Cloudflare Workers, **Paid plan** ($5/month) |
| App framework | Next.js (App Router), deployed with OpenNext for Cloudflare |
| CMS + admin | Payload 3, running inside the same Next.js app |
| Database | Cloudflare D1, via Payload's D1/SQLite adapter |
| File storage | Cloudflare R2, via Payload's R2 storage adapter |
| Image resizing | Cloudflare Images binding, at upload; sizes stored in R2 |
| UI strings + language | next-intl, `localePrefix: 'never'` — language hidden from the URL, used internally so each language caches separately |
| Page cache | OpenNext: R2 incremental cache + D1 tag cache, cleared on save |
| Globe | three.js directly (no wrapper library) |
| Spam protection | Cloudflare Turnstile |
| Analytics | Cloudflare Web Analytics |
| Logs | Workers logs (no external error service) |

Starting point: Payload's official Cloudflare template (Worker + D1 + R2 already wired), **taken from the `v3.92.1` release tag** (`payloadcms/payload/templates/with-cloudflare-d1#v3.92.1`).

**Don't take the template from Payload's `main` branch.** Since 2026-10, `main` is Payload 4.0 beta: its template still pins 3.82.1 in `package.json`, but its code is written for 4.0 (e.g. `generatePayloadViewport` in the admin layout, `storage: [r2Storage()]` instead of `plugins: [...]`). On 3.x the admin fails to load and R2 is silently not wired. Any future template file should come from the tag matching the installed Payload version.

### Versions (repo state 2026-10-28)

| Package | `v3.92.1` template pins | Repo uses | Why it differs |
| --- | --- | --- | --- |
| `payload`, `@payloadcms/*` | 3.92.0 | **3.92.1** | Latest 3.x. All `@payloadcms/*` packages on the same version |
| `next` | 16.3.3 | **16.4.2** | OpenNext 1.20.13 requires `next >=16.4.1`. Payload 3.92 supports `>=16.3.3 <17`. Next 16 decides the API choices below |
| `@opennextjs/cloudflare` | 1.20.1 | **`^1.20.13`** | `>=1.20.3` is the first version that supports `proxy.ts` (03) |
| `wrangler` | `~4.116.0` | **`^4.154.0`** | Current OpenNext requires `^4.148.0` |
| `next-intl` | — | **`^4.14.9`** | Latest 4.x (supports Next 16) |
| `react`, `react-dom` | 19.2.6 | 19.2.6 | As pinned |
| `typescript` | 5.7.3 | 5.7.3 | As pinned (6.x breaks a test-tooling peer) |
| Node | `^22.23.4 \|\| >=24.22.1` | 24 (`.nvmrc`) | |

**Next 16 API choices** (so nobody hits these mid-build):
- `proxy.ts`, not `middleware.ts` (03).
- `revalidateTag(tag, { expire: 0 })` in Payload hooks. The one-argument form is deprecated, and `'max'` would serve the first visitor after a save the old page (08).
- Data caching uses `unstable_cache` with tags, **not** `'use cache'`. `'use cache'` needs `cacheComponents` turned on, which changes how every route renders, including Payload's admin. Not worth that risk here.
- Route segment config (`revalidate = false`, `generateStaticParams`) works because `cacheComponents` stays off.

## Architecture

```
                         ┌──────────────────── One Cloudflare Worker ─────────────────────┐
 Visitor ──▶ public pages│ proxy.ts (language) ──▶ page cache (R2) ──hit──▶ HTML          │
                         │                                │ miss                          │
                         │                                ▼                               │
                         │                     Next.js render ──▶ Payload local API ──▶ D1│
 Artist ───▶ /admin ─────│ Payload admin ──save──▶ revalidateTag ──▶ tag cache (D1)       │
                         │      └──────────────────────────────────────▶ R2 (originals)   │
                         │ /api/site/* (globe, cities, uploads)                           │
                         │ /img/* image route ──▶ R2 derived/ (sizes made at upload)      │
                         └────────────────────────────────────────────────────────────────┘
```

- Public pages are cached per language and only call Payload on a cache miss (08).
- Public pages call Payload's **local API** (a function call inside the Worker), not its HTTP API, always through `lib/data.ts`.
- `/admin` and Payload's `/api/[collection]` REST routes are Payload's own.
- Site-specific endpoints live under `/api/site/` so they never clash with Payload's routes.
- Images are always served through `/img/*` in named sizes. The R2 bucket is private.

## Suggested repo layout (Proposed)

```
src/
  app/
    (site)/[locale]/   public pages: page.tsx (landing), quiz/, works/, works/[slug]/, globe/, about/, privacy/
    (payload)/         Payload admin + REST (from the template)
    api/site/          globe pins, uploads, city search
    img/[...path]/     image route
  collections/         Artworks, Series (labelled "Collections" — 02), Media, GlobePhotos, GlobeUploads, Users
  admin/               custom admin components (review queue, cells, filters, city picker)
  config/
    quiz.ts            steps, option keys, icon file names, feeling weight
    images.ts          named sizes
    limits.ts          upload limits, rate limits, queue cap
  proxy.ts             language choice → next-intl rewrite (03). Next 16's name for middleware
  i18n/
    routing.ts         next-intl routing (localePrefix 'never', cookie)
    ja.json  en.json   all fixed interface strings (incl. quiz words, About text)
  lib/
    data.ts            ALL public reads: Payload local API wrapped in unstable_cache + tags (08)
    matching.ts        scoring + tie-break (pure functions, unit tested)
    normalize.ts       city-name normalizing, shared by the import script and city search (06)
    images.ts          URL builder for named sizes
    i18n.ts            pick() / langOf() for artwork field fallback (03)
    reveal.ts          in-memory reveal flag set by the quiz (03)
  globe/               three.js scene, picking, controls
scripts/
  setup-cloudflare.sh  creates the D1 database and R2 bucket in APAC (01)
  import-geonames.ts   loads the city list into D1
  build-globe-texture.ts  draws land onto the sphere texture
  seed-admin.ts        creates / resets the admin user from env vars
```

## Changes made during the build discussion

The design spec (v1.1) and *NARTIFA Open Decisions.md* have been updated to match. Kept here as a record of what changed from design spec v1.

| Design spec v1 said | Now | Where |
| --- | --- | --- |
| Language in the URL (`/ja/…`, `/en/…`) — Decided | **One URL per page.** Language from cookie, else browser language, else Japanese | 03 |
| Photo GPS data not read or used — Decided | Briefly changed to a GPS pre-fill of the city, then **reverted 2026-10-25**: iOS strips location from web uploads, so it would rarely work. GPS is not read. The server also re-encodes every photo, so none is ever stored | 06 |
| Legal / privacy copy — Deferred | **In v1, before uploads go public:** consent line above Send and a `/privacy` page (design spec 11) | 06, 09 |
| Place suggestions: "City, Country" | Suggestions also show the region (e.g. prefecture) so same-named places can be told apart (Proposed). The stored name stays "City, Country" | 06 |
| Pins are plain white dots (`pin` token) | Plain dots **for now**. Will become the artist's custom PNG later; the build must allow swapping it | 06 |
| Artwork form two-column layout (9c) | **Payload's own layout first**, styled; revisit after the first build | 07 |
| Collections paused | Collection **data** is built now (admin can create them, many per work); only the graphic is paused | 02 |
| "Ask about this work" pre-fills an Instagram DM | **Verify** whether Instagram supports pre-filled text. Fallback decided when built | 03, 09 |
| Upload limits / spam — Still open | **Decided** — see 06 | 06 |
| Ties in matching — Still open | **Decided** — random among top scores | 04 |

## Conventions

1. **Content vs fixed text.** Anything the artist types (artwork fields, collections) lives in Payload with EN/JA fields. Anything fixed (menu, buttons, quiz words, About text, errors) lives in `ja.json` / `en.json`.
2. **Never write a language into a URL by hand.** Use next-intl's `Link` / `redirect` / `useRouter` helpers and read the language through next-intl only. This keeps a future switch to `/ja/` URLs a small change.
3. **Values in config, not code.** Quiz words, feeling weight, image sizes, upload limits and rate limits live in `src/config/` or the i18n files.
4. **Missing data is not rendered** (design spec rule 2). Components take optional props and render nothing for empty values.
5. **Store keys, not words.** Tags are stored as `a`/`b` and feeling keys; the words come from i18n. Changing a word never changes existing data.
6. **Public pages are static.** Nothing under `app/(site)/[locale]/` reads `cookies()`, `headers()` or `searchParams`, and all data comes through `lib/data.ts`. Anything per-visitor happens in the browser (08).
7. **Never `100vh`.** In mobile Safari and Instagram's in-app browser, the toolbars make `100vh` taller than the visible screen, so "one screen" layouts get cut off or scroll.
   - Screens that must fit without scrolling (landing, quiz, reveal): `min-height: 100svh` — the height with toolbars showing.
   - Overlays (menu, photo view, full-screen artwork viewer, upload sheet): `position: fixed; inset: 0`, no viewport units.
   - Globe canvas: fills a `fixed; inset: 0` container and resizes the renderer on `resize` / `ResizeObserver`.
8. **Test in Instagram's in-app browser.** Most visitors arrive there (design spec rule 5). Every phase's check includes it on iPhone and Android, not only Safari and Chrome.
