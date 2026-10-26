# 03 Routing & i18n

## URLs — Decided

One URL per page. **No language in the URL.** (Replaces the design spec's `/ja/…` / `/en/…` prefix.)

| Page | URL |
| --- | --- |
| Landing | `/` |
| Quiz | `/quiz` (steps: `/quiz?s=2` … `?s=6`) |
| All works | `/works` |
| Artwork | `/works/{id}` (reveal: `/works/{id}?r=1`) |
| Globe | `/globe` |
| About | `/about` |
| Admin | `/admin` |

Pages render on each request (see 08), so one URL can serve both languages.

## Choosing the language — Decided

In middleware, in this order:

1. Cookie `lang` (`ja` or `en`) — set by the toggle, kept 1 year.
2. Browser `Accept-Language`: the visitor's top preferred language is Japanese → `ja`; **anything else → `en`**.
3. No header (crawlers, link previews) → `ja`.

The toggle (menu overlay) sets the cookie and refreshes the current page in place. `<html lang>` follows the chosen language.

### Trade-offs accepted

- Search engines index the Japanese version only.
- Social previews are always Japanese (crawlers send no cookie or language).
- A shared link opens in the *recipient's* language, not the sender's.

### Keeping a future switch to `/ja/` URLs cheap

- Use next-intl's `Link`, `redirect` and `useRouter` everywhere — never a plain `<a href>` to an internal page.
- Read the language only through `lib/i18n.ts`.
- Never write a language into a path.

Switching later then means changing next-intl's routing config and adding redirects from old URLs.

## Fixed text — Decided

- next-intl, without i18n routing. Two files: `src/i18n/ja.json`, `src/i18n/en.json`.
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

## Quiz history — Decided (option B)

- Each step pushes a history entry (`/quiz?s=3`). Browser back and the in-page Back link do the same thing: go to the previous step with its answer shown as selected.
- Answers live in memory only (component state). They are not stored anywhere.
- Refreshing or opening `/quiz?s=4` directly restarts at step 1 (and replaces the URL with `/quiz`).
- After the result, browser back lands on `/quiz` and starts fresh at step 1 — answers do not survive leaving the page.
- Leaving through the menu drops the answers, no confirmation (design spec 04).

## Reveal vs detail state — Decided

- The quiz navigates to `/works/{id}?r=1`. The page renders the **reveal** state, then removes `?r=1` from the address bar (`history.replaceState`).
- Copying, sharing or refreshing the URL therefore gives the **detail** state.
- The same flag shows the "Take the quiz again" link at the end of the detail.
- Arriving any other way → detail state only.

## Unavailable works — Decided

- Unknown id, `hidden` or `incomplete` → **HTTP 404** with the "This work is no longer available" page and a link to All Works.
- No separate 410: ids are never reused, so there is nothing to track for deleted works. The same response for all cases also avoids revealing that a hidden work exists.

## All Works scroll position — Decided

Before opening an artwork, save the number of loaded batches and the scroll position in `sessionStorage`. Coming back restores both. Wrap storage access in try/catch; if it fails, start at the top.

## "Ask about this work" (Instagram) — Verify

The design wants a DM with a pre-filled message naming the work.
- **Verify** whether Instagram DM links (`ig.me/m/{handle}`) support pre-filled text.
- If not, decide between: open the DM with no text, or copy a message to the clipboard first with a short "Message copied" note, then open the DM.
- Handle comes from `INSTAGRAM_HANDLE`. New tab on desktop.
