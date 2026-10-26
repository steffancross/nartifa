# 03 Routing & i18n

## URLs — Decided

One URL per page. **No language in the URL.** (Replaces the design spec's `/ja/…` / `/en/…` prefix.)

| Page | URL |
| --- | --- |
| Landing | `/` |
| Quiz | `/quiz` (all six steps — steps are history entries, not URLs; see Quiz history) |
| All works | `/works` |
| Artwork | `/works/{id}` (same URL for reveal and detail — see below) |
| Globe | `/globe` |
| About | `/about` |
| Privacy | `/privacy` (design spec 11) |
| Admin | `/admin` |

Middleware rewrites each URL to a hidden language folder (`/works/12` → `/ja/works/12`), so each language is cached as its own page (08). The visitor only ever sees `/works/12`.

## Choosing the language — Decided

next-intl routing with `localePrefix: 'never'`, `defaultLocale: 'ja'`, `localeCookie: { name: 'lang', maxAge: 60 * 60 * 24 * 365 }`.

The language is decided in this order:

1. Cookie `lang` (`ja` or `en`) — set by the toggle, kept 1 year.
2. Browser `Accept-Language`: the visitor's top preferred language is Japanese → `ja`; **anything else → `en`**.
3. No header (crawlers, link previews) → `ja`.

next-intl's own negotiation looks through the whole `Accept-Language` list (`fr, ja` would give `ja`). To keep rule 2, `proxy.ts` first reduces the header to `ja` or `en` from its **first** entry, then hands the request to next-intl's middleware handler.

**`proxy.ts`, not `middleware.ts`.** The template is on Next.js 16, which renamed middleware to `proxy.ts` and runs it on the Node.js runtime; `middleware.ts` still works there but is deprecated and runs on the edge runtime. OpenNext supports `proxy.ts` from **1.20.3** (the template allows `^1.11.0`, so pin `>=1.20.3`). Fallback if it misbehaves in the spike: rename the file to `middleware.ts` — the code is identical.

Middleware `matcher` excludes `/admin`, `/api`, `/img`, `/_next` and files with an extension, so Payload, the image route and site endpoints never pass through it.

**Toggle** (menu overlay): writes the `lang` cookie (1 year), then `router.replace(pathname, { locale })` from next-intl's navigation helpers. The page re-renders in place, same URL. `<html lang>` follows the chosen language.

### Trade-offs accepted

- Search engines index the Japanese version only.
- Social previews are always Japanese (crawlers send no cookie or language).
- A shared link opens in the *recipient's* language, not the sender's.

### Why not `/ja/` and `/en/` URLs — reconsidered 2026-10-25, kept as is

- **The artist shares links from a Japanese browser.** With prefixes every shared link would be `/ja/…`, and English-speaking followers would land on Japanese. Without them, each visitor gets their own language.
- **Most artwork text is Japanese-only.** `/en/works/12` would mostly repeat the Japanese page with English buttons, so separate English URLs gain little in search or link previews.
- **The code is the same either way.** Pages already live in `[locale]`, so switching later is the change described below.

### Keeping a future switch to `/ja/` URLs cheap

- Use next-intl's `Link`, `redirect` and `useRouter` everywhere — never a plain `<a href>` to an internal page.
- Read the language only through next-intl (`locale` param, `getLocale`, `useLocale`).
- Never write a language into a path.

Switching later then means changing `localePrefix` to `'always'` and adding redirects from old URLs. The `[locale]` folder already exists.

## Fixed text — Decided

- next-intl (routing as above). Two files: `src/i18n/ja.json`, `src/i18n/en.json`.
- Includes all interface text, quiz questions and option words, error messages, the About text and the GeoNames credit.
- A missing English key falls back to Japanese.
- All Japanese text uses line height 1.8 (design spec Tokens).

## Artwork content and fallback — Decided

- Missing English → show Japanese (accepted: many works will be Japanese-only).
- Fetch artworks with `locale: 'all'` and pick per field in code, rather than relying on Payload's silent fallback. This tells us which language each field is in.
- A field shown in Japanese on an English page is wrapped with `lang="ja"`, so the 1.8 line height and screen-reader pronunciation are correct.

```
pick(field, lang) = field[lang] ?? field.ja ?? field.en ?? null
langOf(field, lang) = field[lang] ? lang : (field.ja ? 'ja' : 'en')
```

Machine translation of artwork content: **Deferred.** A possible later add-on is an admin "Fill English from Japanese" button; it needs no data change.

## Quiz history — Decided

What the design needs (design spec 04): each step is its own history entry; browser back and iPhone swipe-back act like the Back link; refresh restarts at step 1; leaving drops the answers; browser back from the result lands on a fresh step 1.

**The problem to avoid:** answers live only in memory, so once the visitor leaves the quiz, the step entries they left behind are dead. Pressing back from the result would land on step 6 with no answers, then step 5, and so on — about six presses to get out of the quiz.

### Mechanism

- **The URL stays `/quiz` for every step.** Steps are entries pushed with `window.history.pushState({ quizStep: n }, '', '/quiz')`. No query string, so the page stays static (08) and nothing mid-quiz can be shared or bookmarked.
  - Next.js (14.1+) supports native `pushState` and keeps our `quizStep` key alongside its own state.
- **Answers** live in the quiz component's state. They are lost whenever the component unmounts (leaving the page, reload), which is exactly the "drop answers" rule.
- **Moving forward:** picking an answer on step *n* pushes `{ quizStep: n + 1 }`. A new pick after going back truncates the forward entries, as browsers always do.
- **Back link** = `history.back()`. Same path as browser back and swipe-back, so the three can't drift apart.
- **Invariant:** step *n*'s entry is always exactly *n − 1* entries after its step-1 entry, because we only push one step forward and only move back through history.

### The one rule that handles every way out

The `quizStep` key is the only state we write, so an entry carrying it is always ours.

1. **On mount**, read `history.state?.quizStep`:
   - No key (arrived from Start, the menu, a link, "Take the quiz again") → step 1, then `replaceState({ quizStep: 1 })` on this entry.
   - Key is 1 → step 1.
   - Key is *n* > 1 → it's a **dead entry** (the component is fresh, so its answers are gone). Show step 1 right away and call `history.go(-(n - 1))` to jump back to that run's step-1 entry.
2. **On `popstate` while mounted**, to step *n*: if steps 1…*n − 1* are all answered, show step *n* (with its answer selected, if any). Otherwise go back to the furthest step that is reachable. This covers the browser's Forward button after a restart.

### What the visitor gets

| Action | Result |
| --- | --- |
| Back link / browser back / swipe-back on step 4 | Step 3, earlier answer selected |
| Forward after going back | Step 4 again, answer kept |
| Pick a different answer on step 3 | Replaces it; old forward steps discarded |
| Browser back on step 1 | Leaves the quiz (to Landing or wherever they came from) |
| Refresh on step 4 | Step 1, fresh. Back from there leaves the quiz |
| Result → browser back | Lands on the dead step 6 entry → jumps to step 1, fresh. One more back leaves the quiz |
| Menu → All Works on step 4 → browser back | Dead step 4 → step 1, fresh |
| "Take the quiz again" | New entry, step 1, fresh |
| Opening `/quiz` in a new tab | Step 1 |

During the jump the visitor sees step 1 immediately; only the history position catches up. Rejected alternative: rewinding history before showing the result. It doesn't cover leaving through the menu, and it needs a wait-then-navigate sequence during the 350ms hold.

### Test cases (Phase 3)

Every row of the table above, on iPhone Safari (including swipe-back), Android Chrome, the Instagram in-app browser and desktop. Plus: double-tap during the hold doesn't skip a step; reduced motion still steps correctly.

## Reveal vs detail state — Decided

The flag is **not in the URL**: a query flag would force the page to render on every request (08).

- The quiz writes the result id into a small in-memory store (`lib/reveal.ts`, a module variable), then navigates with next-intl's `router.push('/works/{id}')` — a client-side navigation, so the store survives.
- The artwork page's client component reads the store on mount. If it holds this page's id → **reveal** state, and the store is cleared after the first render.
- A hard load (shared link, refresh, new tab) starts with an empty store → **detail** state. So does arriving from All Works or browser back.
- The same flag shows the "Take the quiz again" link at the end of the detail.
- The cached HTML is always the detail layout; the reveal is applied in the browser. Since the quiz arrives by client navigation, there's no server HTML to flash first.

## Unavailable works — Decided

- Unknown id, `hidden` or `incomplete` → **HTTP 404** with the "This work is no longer available" page and a link to All Works.
- No separate 410: ids are never reused (`AUTOINCREMENT`, 02), so there is nothing to track for deleted works. The same response for all cases also avoids revealing that a hidden work exists.
- Call `notFound()` in the page before anything streams: **no `loading.tsx` or Suspense boundary above the artwork lookup.** Once streaming starts, Next.js can only send 200.
- `app/(site)/[locale]/works/[slug]/not-found.tsx` renders "This work is no longer available" + link to All Works, in the visitor's language (the `[locale]` layout has already called `setRequestLocale`).

### Any other unknown URL

- `proxy.ts` rewrites every public path into `[locale]`, so an unknown path like `/foo` arrives as `/ja/foo`.
- `app/(site)/[locale]/[...rest]/page.tsx` just calls `notFound()`, and `app/(site)/[locale]/not-found.tsx` renders a plain "Page not found" + link to the landing page, in the same style. HTTP 404.
- This is next-intl's documented pattern. It keeps every 404 inside the localized layout, so no root-level `not-found.tsx` is needed (which would clash with Payload's separate root layout in `(payload)`).
- Unknown `/api/…` paths are outside the matcher and return Payload's own JSON 404.
- 404 renders are cached like any page and cleared by the `works` tag, so a work going live appears at once.

## All Works loading and scroll position — Decided

- The All Works page carries the **full list** of live works in its cached HTML: id, title (ja/en), image id, width, height — about 100 bytes each, ~10KB for 100 works. No list endpoint.
- "Infinite scroll" renders 24 more cards from that list as the visitor nears the bottom. Images lazy-load, so only visible cards cost anything.
- Revisit (switch to a paged endpoint) only if the collection passes ~1,000 works.
- Before opening an artwork, save the number of rendered cards and the scroll position in `sessionStorage`. Coming back restores both. Wrap storage access in try/catch; if it fails, start at the top.

## "Ask about this work" (Instagram) — Verify

The design wants a DM with a pre-filled message naming the work.
- **Verify** whether Instagram DM links (`ig.me/m/{handle}`) support pre-filled text.
- If not, decide between: open the DM with no text, or copy a message to the clipboard first with a short "Message copied" note, then open the DM.
- Handle comes from `INSTAGRAM_HANDLE`. New tab on desktop.
- **Verify inside Instagram's in-app browser too** (iPhone and Android). That's where most visitors are. The question there is whether `ig.me/m/{handle}` opens the native DM screen or a web login page. That matters more than pre-filled text. If it shows a login page, fall back to linking the profile (`instagram.com/{handle}`), which the in-app browser opens natively.
- Same check for the Instagram link in the menu and "Message on Instagram" on About.
