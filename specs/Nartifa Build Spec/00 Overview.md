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
| Image resizing | Cloudflare Image Transformations |
| UI strings | next-intl, **without** URL-based routing |
| Globe | three.js directly (no wrapper library) |
| Spam protection | Cloudflare Turnstile |
| Analytics | Cloudflare Web Analytics |
| Logs | Workers logs (no external error service) |

Starting point: Payload's official Cloudflare template (Worker + D1 + R2 already wired).

## Architecture

```
                         ┌──────────────── One Cloudflare Worker ────────────────┐
 Visitor ──▶ public pages│ Next.js pages ──▶ Payload local API ──▶ D1 (records)  │
                         │      │                    │                           │
 Artist ───▶ /admin ─────│ Payload admin ────────────┘──────────▶ R2 (originals)  │
                         │      │                                     │          │
                         │ /api/site/* (globe, cities, uploads) ──────┘          │
                         │ /img/* image route ──▶ Image Transformations ──▶ edge │
                         └────────────────────────────────────────────────────────┘
```

- Public pages call Payload's **local API** (a function call inside the Worker), not its HTTP API.
- `/admin` and Payload's `/api/[collection]` REST routes are Payload's own.
- Site-specific endpoints live under `/api/site/` so they never clash with Payload's routes.
- Images are always served through `/img/*` in named sizes. The R2 bucket is private.

## Suggested repo layout (Proposed)

```
src/
  app/
    (site)/            public pages: page.tsx (landing), quiz/, works/, works/[slug]/, globe/, about/
    (payload)/         Payload admin + REST (from the template)
    api/site/          globe pins, uploads, city search
    img/[...path]/     image route
  collections/         Artworks, Collections, Media, GlobePhotos, GlobeUploads, Users
  admin/               custom admin components (review queue, cells, filters, city picker)
  config/
    quiz.ts            steps, option keys, icon file names, feeling weight
    images.ts          named sizes
    limits.ts          upload limits, rate limits, queue cap
  i18n/
    ja.json  en.json   all fixed interface strings (incl. quiz words, About text)
  lib/
    matching.ts        scoring + tie-break (pure functions, unit tested)
    images.ts          URL builder for named sizes
    i18n.ts            the ONE function that reads the current language
  globe/               three.js scene, picking, controls
scripts/
  import-geonames.ts   loads the city list into D1
  build-globe-texture.ts  draws land onto the sphere texture
  seed-admin.ts        creates / resets the admin user from env vars
```

## Changes made during the build discussion

The design spec (v1.1) and *NARTIFA Open Decisions.md* have been updated to match. Kept here as a record of what changed from design spec v1.

| Design spec v1 said | Now | Where |
| --- | --- | --- |
| Language in the URL (`/ja/…`, `/en/…`) — Decided | **One URL per page.** Language from cookie, else browser language, else Japanese | 03 |
| Photo GPS data not read or used — Decided | **GPS read in the browser to pre-fill the city**, rounded, never sent or stored. Only the city is shown | 06 |
| Pins are plain white dots (`pin` token) | Plain dots **for now**. Will become the artist's custom PNG later; the build must allow swapping it | 06 |
| Artwork form two-column layout (9c) | **Payload's own layout first**, styled; revisit after the first build | 07 |
| Collections paused | Collection **data** is built now (admin can create them, many per work); only the graphic is paused | 02 |
| "Ask about this work" pre-fills an Instagram DM | **Verify** whether Instagram supports pre-filled text. Fallback decided when built | 03, 09 |
| Upload limits / spam — Still open | **Decided** — see 06 | 06 |
| Ties in matching — Still open | **Decided** — random among top scores | 04 |

## Conventions

1. **Content vs fixed text.** Anything the artist types (artwork fields, collections) lives in Payload with EN/JA fields. Anything fixed (menu, buttons, quiz words, About text, errors) lives in `ja.json` / `en.json`.
2. **Never write a language into a URL by hand.** Use next-intl's `Link` / `redirect` helpers and read the language through `lib/i18n.ts` only. This keeps a future switch to `/ja/` URLs a small change.
3. **Values in config, not code.** Quiz words, feeling weight, image sizes, upload limits and rate limits live in `src/config/` or the i18n files.
4. **Missing data is not rendered** (design spec rule 2). Components take optional props and render nothing for empty values.
5. **Store keys, not words.** Tags are stored as `a`/`b` and feeling keys; the words come from i18n. Changing a word never changes existing data.
