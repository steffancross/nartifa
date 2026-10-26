# 09 Build Order

Each phase ends with something usable on the live Worker. Design spec pages are in brackets.

## Phase 0 — Setup and early checks

- Deploy Payload's Cloudflare template to Steffan's account (Workers Paid, D1, R2).
- Repo layout, tokens as CSS variables, fonts, i18n files, `lib/i18n.ts`, middleware for language.
- `seed-admin` script; admin login works.
- **Do the Verify items below first** — several affect later phases.

## Phase 1 — Data model and artwork admin [09]

- Collections: `artworks`, `collections`, `media`, `users` (02).
- Status hook, block deleting in-use media.
- Artworks table: quick filters, custom cells, row menu.
- Artwork form in Payload's layout → **review the look**; decide stock vs custom 9c.
- Image route + named sizes (05).
- Artist can now upload test works.

## Phase 2 — Artwork page and All Works [05, 06]

- Artwork page detail state: missing fields, extra images, full-screen viewer, 404.
- Field-level language fallback with `lang` attributes.
- All Works grid: newest first, infinite scroll (24 per batch), placeholders, scroll restore.
- Social previews.

## Phase 3 — Quiz and matching [04, 05]

- `quiz.ts` config, i18n words, placeholder icons.
- Six steps, highlight-then-advance, Back + browser history (option B).
- `matching.ts` with unit tests (04).
- Reveal state, `?r=1` handling, "Take the quiz again".

## Phase 4 — Landing, menu, About [01, 03, 08]

- Top bar, full-screen menu, language toggle (cookie), Instagram link.
- Landing with placeholder image.
- About from i18n, incl. GeoNames credit.
- "Ask about this work" link (per the Instagram Verify result).
- Cloudflare Web Analytics.

## Phase 5 — Globe [07, 10]

- `globe-photos`, `globe-uploads`, `cities` + `import-geonames`.
- Globe texture script, three.js scene, pins, picking, controls, photo view.
- Upload sheet: GPS pre-fill, re-encode, city search, Turnstile, server checks.
- Admin: review queue, submissions table, edit upload with city picker.

## Phase 6 — Polish and go-live

- Bilingual checks with real text (design spec rules; 375px widths).
- Reduced motion, keyboard, focus.
- Fresh setup on the artist's account: Worker, D1, R2, Turnstile keys, domain, analytics, `import-geonames`, `seed-admin`.

## Verify early

| Item | Why it matters | Where |
| --- | --- | --- |
| Payload D1 ids never reused (`AUTOINCREMENT`)? | Ids are URL slugs | 02 |
| Payload records image width/height without `sharp`? | Placeholders need the shape | 02, 05 |
| How to transform private R2 images from the Worker, and that it's billed per unique transformation | Cost and privacy | 05 |
| Image Transformations on the build domain (zone vs `workers.dev`) | Images during the build | 01 |
| Instagram DM pre-filled text possible? | "Ask about this work" | 03 |
| Payload admin: redirect dashboard → artworks, hide collections from nav, override delete text | Admin polish | 07 |

## Still open

| Item | Owner | Notes |
| --- | --- | --- |
| Globe final look (7f) | Artist | Texture regenerated once decided |
| Custom pin PNG + flat or facing | Artist | Dots until it arrives |
| Quiz and feeling icons | Artist | Placeholders until then |
| Landing image, site-wide share image | Artist | Placeholders until then |
| Copy (landing line, quiz questions, reveal line, upload text, About) | Artist | i18n placeholders |
| Instagram DM fallback | Steffan | After the Verify item |
| Artwork form: stock or custom 9c | Steffan | After Phase 1 review |
