# 09 Build Order

Each phase ends with something usable on the live Worker. Design spec pages are in brackets.

## Phase 0 — Setup and early checks

- Deploy Payload's Cloudflare template to Steffan's account (Workers Paid, D1 and R2 in `apac` — see 01).
- OpenNext cache: R2 incremental cache + D1 tag cache, both bound to the existing bucket and database; `open-next.config.ts` (08).
- Update packages to the versions in 00 (OpenNext `>=1.20.3`, wrangler `^4.148.0`, Payload latest 3.x).
- Repo layout, tokens as CSS variables, fonts, i18n files, next-intl routing (`localePrefix: 'never'`), `proxy.ts`, localized 404s (03), `lib/data.ts` with one tagged read and one revalidating hook.
- `seed-admin` script; admin login works.
- **Do the Verify items below first** — several affect later phases.

## Phase 1 — Data model and artwork admin [09]

- Collections: `artworks`, `series` (labelled "Collections"), `media`, `users` (02).
- Status hook, block deleting in-use media.
- Artworks table: quick filters, custom cells, row menu.
- Artwork form in Payload's layout → **review the look**; decide stock vs custom 9c.
- Generate-sizes hooks, orientation fix, image route (05).
- Artist can now upload test works.

## Phase 2 — Artwork page and All Works [05, 06]

- Artwork page detail state: missing fields, extra images, full-screen viewer, 404.
- Field-level language fallback with `lang` attributes.
- All Works grid: newest first, full list in the page, 24 more cards at a time, placeholders, scroll restore (03).
- Social previews.

## Phase 3 — Quiz and matching [04, 05]

- `quiz.ts` config, i18n words, placeholder icons.
- Six steps, highlight-then-advance, Back + browser history: `quizStep` entries and the dead-entry rule, with the test cases (03).
- `matching.ts` with unit tests (04).
- Reveal state via the in-memory flag (03), "Take the quiz again".

## Phase 4 — Landing, menu, About [01, 03, 08]

- Top bar, full-screen menu, language toggle (cookie), Instagram link.
- Landing with placeholder image.
- About from i18n, incl. GeoNames credit.
- "Ask about this work" link (per the Instagram Verify result).
- Cloudflare Web Analytics.

## Phase 5 — Globe [07, 10]

- `globe-photos`, `globe-uploads`, `cities` + `import-geonames`.
- Globe texture script, three.js scene, pins, picking, controls, photo view.
- Upload sheet: re-encode, city search with region in suggestions, Turnstile, server checks, server-side clean copy.
- Admin: review queue, submissions table, edit upload with city picker.
- Consent line above Send and the `/privacy` page (design spec 11). **The upload form doesn't go public without them**, and not before the artist has answered "use beyond the site?".

## Phase 6 — Polish and go-live

- Bilingual checks with real text (design spec rules; 375px widths).
- Full pass in Instagram's in-app browser on iPhone and Android: one-screen layouts not cut off (`svh`, convention 7), quiz history, globe, photo upload, Turnstile, DM links.
- Reduced motion, keyboard, focus.
- Fresh setup on the artist's account: Worker, D1, R2, Turnstile keys, domain, analytics, `import-geonames`, `seed-admin`.

## Verify early

| Item | Why it matters | Where |
| --- | --- | --- |
| Worker bundle under 10MB compressed, and cold-start time from Japan | Paid plan limit; first impression for Instagram visitors | 01 |
| Page cache works end to end: second visit to a page doesn't call Payload (log it); an admin save clears it; `ja` and `en` cached separately; tag cache table created by `opennextjs-cloudflare deploy` | Whole caching design rests on this | 08 |
| `autoIncrement: true` is set before the first migration, and works on D1: create works 1–3, delete 3, create one → it gets 4 | Ids are permanent URL slugs | 02 |
| Image pipeline end to end on `workers.dev`: upload a portrait phone JPEG → all six sizes appear in `derived/`, upright, no EXIF in the output, stored width/height portrait; an oversized file is rejected with a message | Whole image design rests on this | 01, 05 |
| Instagram DM link: pre-filled text possible? Opens the native DM (not a web login) from **inside Instagram's in-app browser** on iPhone and Android? | "Ask about this work", About, menu | 03 |
| Payload admin: redirect dashboard → artworks, hide collections from nav, override delete text | Admin polish | 07 |

## Still open

| Item | Owner | Notes |
| --- | --- | --- |
| Globe final look (7f) | Artist | Texture regenerated once decided |
| Custom pin PNG + flat or facing | Artist | Dots until it arrives |
| Quiz and feeling icons | Artist | Placeholders until then |
| Landing image, site-wide share image | Artist | Placeholders until then |
| Copy (landing line, quiz questions, reveal line, upload text, About) | Artist | i18n placeholders |
| Visitor photos used beyond the site? | Artist | Changes the consent line; must be settled before the first upload |
| Privacy page operator line; review of both drafts | Artist | Design spec 11 |
| Instagram DM fallback | Steffan | After the Verify item |
| Artwork form: stock or custom 9c | Steffan | After Phase 1 review |
