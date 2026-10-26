# NARTIFA — Design Spec: Overview

Version 1.1 · 2026-10-25 · For the developer building the site. Read alongside the build spec.

This folder describes the pages, how they look and how they connect. The build spec covers data, matching logic and infrastructure. When the two disagree, raise it — don't guess.

## Files

| File | Covers |
| --- | --- |
| 00 Overview.md | This file — flow, sitemap, conventions |
| 00 Tokens.md | Colors, type, spacing, motion, breakpoints |
| 01 Navigation.md | Menu, language toggle (no footer) |
| 03 Landing.md | First screen |
| 04 Quiz.md | Six-step quiz |
| 05 Artwork Page.md | Reveal + detail states |
| 06 All Works.md | Grid, card (collection graphic paused) |
| 07 Globe.md | Globe, pins, photo view, upload |
| 08 About.md | About + contact |
| 09 Admin Artworks.md | Login, artworks table, artwork form |
| 10 Admin Globe.md | Review queue, submissions table, edit |
| 11 Privacy.md | Upload consent line, privacy page (drafts in EN/JA) |
| ../NARTIFA Open Decisions.md | Everything decided and still open |

Page numbers follow the wireframes. There is no 02 — the artwork card now lives in 06.

Each page links its wireframe options by id (e.g. **5a**). The wireframes are in the `NARTIFA Wireframes` project; screenshots are in `images/`.

The screenshots only show the top of each wireframe section (usually the first option). Use the wireframes project for the full set. **Where a wireframe and this text disagree, the text wins.** The wireframes were drawn before the decisions were made.

## Status labels

- **Decided** — agreed with the client. Build as written.
- **Proposed** — designer's recommendation, not yet confirmed. Build it, but keep it easy to change.
- **Deferred** — not in v1. Don't block it.

## Main flow

```
Landing ──Start──▶ Quiz (6 steps) ──▶ Artwork page (reveal state)
                                          │ scroll / arrow
                                          ▼
                                     Artwork page (detail state)

Menu (any page) ─▶ All Works (grid) ─▶ Artwork page (detail state)
                ─▶ Globe ─▶ tap pin ─▶ Photo view
                         └▶ Upload ─▶ Thank you
                ─▶ About / Contact ─▶ Instagram DM
```

Admin is a separate login-only area (`/admin`). It is not linked from the public site.

## Sitemap (public) — Decided

| Page | URL |
| --- | --- |
| Landing | `/` |
| Quiz | `/quiz` |
| Artwork | `/works/{id}` (a number, e.g. `/works/12`) |
| All works | `/works` |
| Globe | `/globe` |
| About | `/about` |
| Privacy | `/privacy` (not in the menu — linked from the upload form and About; see 11) |

## Language — Decided

- **No language in the URL.** One URL per page; the same URL shows Japanese or English.
- Which language a visitor sees:
  1. Their saved choice (set by the toggle, remembered).
  2. Otherwise their browser language: Japanese browser → Japanese, any other → English.
  3. Otherwise (link previews, search engines) → **Japanese**.
- Japanese is the default language.
- A shared link opens in the *recipient's* language. Link previews and search results are in Japanese.

## Rules for every page

1. **Two languages.** Every interface string exists in EN and JA. Japanese is often shorter in characters but taller in line height; English is longer. Nothing may overflow, truncate or wrap awkwardly in either.
2. **Missing data is not shown.** If a field is empty, don't render its label, its space or a placeholder. No "N/A", no "—".
3. **If English is missing, show Japanese** rather than an empty page — Decided. Expect many artworks to have Japanese text only; English pages will often show Japanese artwork text. Japanese text on an English page keeps Japanese line height (1.8).
4. **Spare by default.** The artwork and the quiz are the experience. Menus, labels and chrome stay small and quiet.
5. **Mobile first.** Design for 375px wide, then widen. Most visitors arrive from Instagram on phones.

## Out of scope for v1 (Deferred)

- Showing several matched works instead of one
- Payments / checkout (inquiry goes to Instagram DM instead)
- Automatic moderation of globe uploads
- Visitor accounts
- Collection graphic before All Works (paused — see 06)
- Pin grouping on the globe
- Machine translation of artwork text

(Legal / privacy copy was here; it's now in v1 — see 11.)
