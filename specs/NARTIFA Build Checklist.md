# NARTIFA — Build Checklist

Created 2026-10-26. Tick items as they're done: `- [ ]` → `- [x]`.

The checklist covers what to do; the specs cover how. References: **B** = *Nartifa Build Spec*, **D** = *Nartifa Design Spec* (e.g. B05 = Build Spec/05 Images.md). A phase is done when its **Phase check** is ticked. Lines with `___` are for writing down a result.

---

## Waiting on upstream releases

Two bugs in dependencies, both fixed upstream but not released yet (found 2026-10-30). Check at the start of each work session; **Phase 0 can't be ticked off until both are done.**

- [ ] **Payload: admin login on Workers** (B01, Blocker). Fixed by payloadcms/payload #19074 (3.x), merged 2026-10-29.
  - Check: `npm view payload version`. Waiting for anything newer than **3.92.1**; confirm its release notes mention `auth.passwordHashIterations`.
  - Then: upgrade `payload` and every `@payloadcms/*` to that version → add `auth: { passwordHashIterations: 100000 }` to `payload.config.ts` → deploy → reset every account with `pnpm seed-admin:remote` → log in at `/admin` on workers.dev.
  - Unblocks: the `seed-admin` / login line below, the page-cache "admin save clears it" check, the ids recheck on the real D1, the admin tweaks, and Phase 1's artist login.
- [ ] **OpenNext: cached pages always read STALE** (B08, Known issue). Fixed by opennextjs/opennextjs-aws #1317, merged 2026-10-29.
  - Check: `npm view @opennextjs/aws version` (waiting for newer than **4.1.13**) **and** `npm view @opennextjs/cloudflare dependencies` (waiting for a release whose `@opennextjs/aws` is that newer version; it pins it exactly, so both have to ship).
  - Then: upgrade `@opennextjs/cloudflare` → `pnpm run deploy:app` → visit `/` twice in each language: the second visit must say `x-nextjs-cache: HIT`, and `wrangler tail` must show no "Failed to revalidate stale page".
  - Unblocks: the page-cache Verify line below.

---

## Phase 0 — Foundation and early checks

The risky assumptions get proven here. If one fails, update the spec before moving on.

**Setup**
- [x] Workers Paid plan on Steffan's account (B01)
- [x] Payload Cloudflare template running locally — from the `v3.92.1` tag, not `main` (B00)
- [x] Packages updated: Payload latest 3.x (all `@payloadcms/*` on one version), OpenNext `>=1.20.3`, wrangler `^4.148.0`, next-intl 4.x (B00 Versions)
- [x] D1 created with `--location=apac`; R2 bucket created with `apac` hint (B01 Location) — by `scripts/setup-cloudflare.sh`; both report APAC (2026-10-29)
- [x] `autoIncrement: true` in the D1 adapter — **before the first migration**; template migration replaced (B02 Permanent links)
- [x] Bindings: `D1`, `R2`, `IMAGES`, `NEXT_INC_CACHE_R2_BUCKET` (same bucket), `NEXT_TAG_CACHE_D1` (same database) (B01). `WORKER_SELF_REFERENCE` dropped: only needed for a queue (B01, B08)
- [x] Secrets and vars: `PAYLOAD_SECRET`, `IP_HASH_SALT` as Worker secrets, set after the first `deploy:app` (set in the dashboard 2026-10-30). Admin accounts: `seed-admin` prompts, no env vars. `INSTAGRAM_HANDLE` when the artwork page needs it; Turnstile keys in Phase 5 (B01)
- [x] `pnpm lint` works: `eslint.config.mjs` imports `eslint-config-next` 16's flat configs directly (the template's FlatCompat setup crashed ESLint 9); generated files ignored; `@eslint/eslintrc` removed (2026-10-30)
- [x] `open-next.config.ts`: R2 incremental cache + D1 tag cache, no queue (B08) — `opennextjs-cloudflare build` passes (2026-10-29); working cache checked under Verify
- [x] Deployed to `workers.dev` with `opennextjs-cloudflare deploy` — https://nartifa.steffancross.workers.dev (2026-10-30): migrations applied, `revalidations` created, 6 bindings, startup 22 ms
- [ ] `seed-admin` script; admin login works (B01) — script done (prompts for email/password); Steffan's account created on the real D1 (2026-10-30). **Login on the Worker blocked** by Payload's 600k PBKDF2 vs the Workers 100k cap (B01 Blocker): upgrade to the next Payload 3.x release, set `auth.passwordHashIterations: 100000`, reset the account, log in. Artist account later

**Structure**
- [ ] Repo layout per B00: `app/(site)/[locale]/`, `(payload)/`, `api/site/`, `img/`, `config/`, `lib/` — `(site)/[locale]/`, `(payload)/`, `lib/` done (template demo `(frontend)` removed); `api/site/`, `img/`, `config/` appear with their first file in later phases
- [x] Tokens as CSS variables (public dark + admin light), fonts defined in one place (D00 Tokens, B08) — public tokens in `src/styles/tokens.css`, fonts in `src/styles/fonts.ts` (2026-10-30). Admin stays on Payload's **dark** theme for now (Steffan's call); light admin colors later
- [x] next-intl routing: `localePrefix: 'never'`, default `ja`, cookie `lang` for 1 year (B03)
- [x] `proxy.ts`: first `Accept-Language` entry → `ja`/`en`, then next-intl; matcher skips `/admin`, `/api`, `/img`, `/_next`, files (B03) — unit + e2e tests pass locally (2026-10-30)
- [x] `ja.json` / `en.json` with placeholder text
- [x] Localized 404s: `[locale]/[...rest]/page.tsx` + `[locale]/not-found.tsx` (B03) — HTTP 404 in both languages (e2e)
- [x] `lib/data.ts` with one `unstable_cache` read tagged `works`; one Payload hook calling `revalidateTag('works', { expire: 0 })` (B08) — `getMediaCount` + `revalidateOnChange` on `media`; unit + e2e tests pass locally (2026-10-30). Live caching is the page-cache Verify line

**Verify** (B09)
- [x] Bundle under 10MB compressed — size: 3.68 MB gzipped, confirmed by the first deploy (2026-10-30); 4.20 MB after chunk 2b (Payload's local API now also in the public pages); recheck after Phase 1
- [ ] Cold start from Japan — time: ___
- [ ] Page cache: second visit doesn't call Payload (log it); an admin save clears it; `ja` and `en` cached separately; `revalidations` table created by deploy — `revalidations` created (2026-10-30). **First live check failed:** every visit to `/` returns `x-nextjs-cache: STALE` and logs "Failed to revalidate stale page /en — Dummy queue is not implemented". Cause: pages rendered on first visit aren't in the prerender manifest, and Next then assumes revalidate after 1 second unless the same instance rendered them (Workers instances don't share that memory). Known OpenNext bug ([opennextjs-aws#1250](https://github.com/opennextjs/opennextjs-aws/issues/1250)), fixed in #1317, not released yet: upgrade `@opennextjs/cloudflare` when a release includes it, then re-check (B08 Known issue)
- [x] `proxy.ts` works on OpenNext (language switches correctly). If not: rename to `middleware.ts` — passed on workers.dev 2026-10-30: all language rules, cookie, localized 404s, `/ja` → 307 to `/`, `/admin` and `/api` untouched
- [x] Ids never reused: create 1–3, delete 3, create one → it gets 4 (on `media` in Phase 0; `artworks` again in Phase 1 — B02) — passed locally 2026-10-28: got 4. Recheck on the real D1 after the first deploy
- [x] Images binding works on `workers.dev` (one test transform) — all six sizes on Cloudflare via `wrangler dev --remote`, no zone needed (2026-10-30). Two live-vs-local differences recorded in B05
- [ ] Payload admin can: redirect dashboard → artworks, hide collections from nav, change delete confirm text (B07)
- [ ] **Phase check:** everything above passes, or the spec is updated with what changed

---

## Phase 1 — Data model and artwork admin (D09)

**Collections** (B02)
- [x] `artworks` with all fields, incl. `status`, `missing`, `searchText` (2026-10-30; the hooks that fill them are below)
- [x] `series`, labelled "Collections" / "コレクション" — `nameJa` + `nameEn`, both required (2026-10-30)
- [x] `media`: R2 under `media/`, JPG/PNG/WebP, `upload.limits.fileSize: 20_000_000` (B05) — also: `alt` removed, read access logged-in only (originals were public via `/api/media/file`)
- [x] `users`: one account per person (Steffan, artist), forgot-password off (B01) — link hidden via admin CSS; the artist's account is created with `seed-admin:remote` once live login works
- [x] Ids never reused on `artworks`: repeat the Phase 0 test (B02) — permanent test `tests/int/artworks-ids.int.spec.ts`, passes locally; recheck on the real D1 with the Phase 0 one
- [ ] Migrations generated and applied — `20261030_182139_collections` generated (2026-10-30; regenerated when collections got two required names). Applied to the real D1 by the next `pnpm run deploy`

**Hooks**
- [x] Status hook computes `status` and `missing` (B02) — on the whole work, so a Live-only save is right (2026-10-30)
- [x] Deleting a `media` used as a `mainImage` takes the work off the site (`incomplete`, Live left on) — changed from "blocked" (B02, 2026-10-30)
- [x] `searchText` filled with both titles; `listSearchableFields: ['searchText']` (B07)
- [x] Revalidation: `artworks`, `media`, `series` → `works`; skipped when `context.skipRevalidate` (B08)
- [x] Collection slug from the English name, made unique (B02)
- All five: unit + `tests/int/hooks.int.spec.ts`, pass locally (2026-10-30)

**Images** (B05)
- [ ] `config/images.ts` sizes; `lib/images.ts` URL builder
- [ ] `beforeChange`: all sizes via the binding, kept in `req.context`; throw on failure
- [ ] Orientation fix: compare `lg` output shape with stored width/height, swap if different
- [ ] `afterChange`: write `derived/{collection}/{id}/{size}.webp`
- [ ] `afterDelete`: delete original + derived files
- [ ] Image route `/img/{collection}/{id}/{size}?v=`: checks, R2 read, rebuilds a missing size, cache headers
- [ ] Verify: portrait phone JPEG → all sizes upright, no EXIF, stored dimensions portrait — binding part confirmed on Cloudflare (upright, no EXIF); the stored-dimensions swap is checked once the pipeline exists
- [ ] Verify: an oversized file is rejected with a clear message — Cloudflare's limit is 100 MP / 50,000px (error 9413); the local runtime has none, so the hook checks the limit itself (B05)

**Admin UI** (B07)
- [ ] `/admin` opens on the artworks table; nav: Artworks · Review queue · Submissions · Collections
- [ ] Admin colors; EN/JA field labels; delete confirm says it can't be recovered
- [ ] Artworks table: quick filters, custom cells (thumb, title, price, status with what's missing, updated, ⋯ menu), empty state
- [ ] Artwork form in Payload's layout: sidebar (Live, status note, Collections) + sections (Images, Matching, Content); price/year validation
- [ ] **Decision:** stock form layout good enough, or build custom 9c? → ___
- [ ] **Phase check:** the artist can log in and add test works

---

## Phase 2 — Artwork page and All Works (D05, D06)

- [ ] Artwork detail: stacked on mobile; 60/40 on desktop with sticky text (D05)
- [ ] Fields in order; empty ones not rendered; image + price alone looks finished (D05)
- [ ] Field-level language fallback with `lang="ja"` wrapping (B03)
- [ ] Price: "¥22,000" / "Price on request"
- [ ] Extra images: thumbnails, swap, full-screen viewer with ✕, swipe on mobile
- [ ] Image placeholders at the stored shape (`surface-2`)
- [ ] "No longer available" 404: `notFound()` before streaming, no `loading.tsx` above the lookup (B03)
- [ ] All Works: full list in page, newest first, 24 cards at a time; 2/3/4 columns; square cards; one-line title (D06, B03)
- [ ] All Works states: first load, loading more, few works, error + Try again (D06)
- [ ] Scroll position restored on back (B03)
- [ ] Social previews: title, `og` image, Japanese description (B08)
- [ ] **Phase check:** pages cached per language; an admin save shows on the next visit

---

## Phase 3 — Quiz and matching (D04, B03, B04)

- [ ] `config/quiz.ts`, i18n words, placeholder icons
- [ ] Step screens: counter, question, two tiles; step 6 as 2×2 on mobile / row of four on desktop
- [ ] Selecting: invert 150ms → hold 350ms (extra taps ignored) → advance 250ms; reduced motion = instant
- [ ] Keyboard: arrow keys + Enter; focus outline
- [ ] History: `quizStep` entries, Back = `history.back()`, dead-entry rule on mount, `popstate` rule (B03)
- [ ] `lib/matching.ts` + unit tests: exact match, closest match, random ties, one work, empty list (B04)
- [ ] "No works yet" state
- [ ] Reveal: `lib/reveal.ts` flag + client navigation; fade 600ms after ~300ms; down arrow; "Take the quiz again" (B03, D05)
- [ ] Result page prefetched during the hold
- [ ] History test table (B03) passes on:
  - [ ] iPhone Safari (incl. swipe-back)
  - [ ] Android Chrome
  - [ ] Instagram in-app, iPhone
  - [ ] Instagram in-app, Android
  - [ ] Desktop
- [ ] **Phase check**

---

## Phase 4 — Landing, menu, About (D01, D03, D08)

- [ ] Top bar: 56px, wordmark → landing, menu icon, 44px tap targets
- [ ] Menu overlay: four links, current page highlighted, ✕ / Escape / link closes, page behind locked, 250ms fade
- [ ] Language toggle `EN / JA`: writes `lang` cookie, `router.replace` in place (B03)
- [ ] Instagram link in the menu
- [ ] Landing: placeholder image, line, Start, "or see all works"; fits one screen with `svh` (D03, B00 convention 7)
- [ ] About: title, optional photo, text from i18n, Message on Instagram, Privacy link + GeoNames credit (D08)
- [ ] Verify Instagram DM links from inside Instagram's in-app browser; fallback to profile link if needed (B03)
- [ ] "Ask about this work" link, per that result
- [ ] Cloudflare Web Analytics
- [ ] **Phase check**

---

## Phase 5 — Globe (D07, D10, D11)

**Data**
- [ ] `globe-photos` (R2 `globe-photos/`), `globe-uploads`, `upload_attempts` table + migration (B02)
- [ ] `cities` table migration; `lib/normalize.ts`
- [ ] `import-geonames` run — cities: ___ · with Japanese name: ___ · with region: ___ (B02)
- [ ] City search endpoint: range query, 2 Latin / 1 Japanese character minimum, top 8 (B06)

**Globe**
- [ ] `build-globe-texture` script (Natural Earth, 2048×1024)
- [ ] three.js scene, loaded only on `/globe`
- [ ] Pins: one `Points` object, plain dots, same-city spiral, material easy to swap for the custom pin
- [ ] Tapping: nearest pin within 22px, far side ignored, tap vs drag
- [ ] Controls: rotate + zoom, no pan, damping, auto-rotate until first touch, off with reduced motion, paused when tab hidden
- [ ] Loading circle; no-WebGL fallback
- [ ] Pins + upload detail endpoints, cached with the `globe` tag (B06)
- [ ] Photo view

**Upload**
- [ ] Upload sheet (bottom sheet / side panel): photo + preview, place search with region, comment counter, Turnstile, consent line, Send states (D07, D11)
- [ ] Browser re-encode: 2400px, JPEG ~0.85
- [ ] Server checks in order: Turnstile → visitor limit → IP limit → queue cap → file → city → comment (B06)
- [ ] Visitor cookie `v` set on first upload only
- [ ] Server clean copy: binding → WebP, the only file stored (B06)
- [ ] Thank you state
- [ ] `/privacy` page (D11)

**Admin** (B07, D10)
- [ ] Review queue: newest first, count badge, New dot via `seenAt`, Approve/Reject save at once, 5s Undo, row error, larger photo view, empty state
- [ ] Waiting count next to "Review queue" in the nav
- [ ] Submissions table: filters ("All" excludes Rejected), Restore, search, columns, bulk reject
- [ ] Edit upload: city picker, coordinates read-only
- [ ] Admins can see non-live photos through the image route
- [ ] Revalidation: `globe-uploads`, `globe-photos` → `globe`
- [ ] **Before uploads open to the public:** artist's privacy answers are in (see Waiting on the artist)
- [ ] **Phase check**

---

## Phase 6 — Polish and go-live

**Polish**
- [ ] Real copy in both languages; bilingual checks at 375px (D00 rules)
- [ ] Reduced motion everywhere; keyboard and focus
- [ ] Full Instagram in-app pass, iPhone and Android: layouts, quiz, globe, upload, Turnstile, DM links (B00 convention 8)
- [ ] Logging: failed uploads, Turnstile failures, rate-limit hits, image route errors — never IPs, photos or coordinates (B08)

**Go-live on the artist's account** (B01)
- [ ] Workers Paid plan on the artist's account
- [ ] D1 (`apac`) + R2 (`apac`) created by the setup script
- [ ] Secrets and vars set; Turnstile keys for the real domain
- [ ] Custom domain attached
- [ ] Migrations, `seed-admin`, `import-geonames` run
- [ ] Deployed; every page checked in both languages
- [ ] Web Analytics on the real domain; Workers logs on
- [ ] **Launched**

---

## Waiting on the artist

Placeholders stand in until each one arrives. Only the privacy items block anything (public uploads).

- [ ] Quiz and feeling icons
- [ ] Landing image
- [ ] Site-wide share image
- [ ] Copy: landing line, quiz questions, reveal line, upload text, About
- [ ] About photo (optional)
- [ ] Globe final look (7f)
- [ ] Custom pin image, and flat or facing the viewer
- [ ] Privacy: visitor photos used beyond the site? (D11)
- [ ] Privacy: operator line (D11)
- [ ] Review of the consent line and privacy drafts (D11)
