# NARTIFA — Decisions

Updated 2026-10-25. Visual details live in *Design Spec/*. Build details live in *Build Spec/*.

## Decided

**Quiz & matching**
- Five senses are a **choice between two words**. Words: nature/industrial, wood/metal, sweet/spicy, smooth/rough, bird/train — for now, easy to change (interface text files).
- Feeling is **one choice** from joy, anger, sorrow, delight (fixed for now). 2×2 on mobile.
- All options shown as **icon + word**, including feelings. The artist draws the icons; blank placeholders for now.
- After tapping: **brief highlight, then advance**.
- **Back button** on every step after the first. Browser back does the same.
- **Menu icon stays** during the quiz (no separate exit).
- One matched work. Score = one point per matching sense + one point for a matching feeling. **No exact match → show the closest.**
- **Ties → one of the tied works at random**, so every work can be reached.
- **Retake allowed**, always from a fresh start.
- Result goes to that artwork's page.

**Pages**
- Landing: **centered image + start button**. Image is a separate file from the artist (placeholder for now).
- Menu: icon → **full-screen overlay** on all sizes. **No footer** — Instagram and language live in the menu.
- Artwork page: **reveal + down arrow** after the quiz; detail only from elsewhere. Extra images as **thumbnails under the main image** (5e). Unavailable works show one "no longer available" page.
- All Works: **goes straight to the grid** for now. **Square grid** (6a), **image + title** card (2b), **newest first** (date added), **infinite scroll**, scroll position kept.
- About: **one page**, contact at the end, text kept in the code (not the admin). GeoNames credit at the bottom.

**Data & language**
- Default language **Japanese**. **No language in the URL** — the choice is remembered; first visit follows the browser (Japanese → JA, anything else → EN).
- Missing English → **show Japanese**. A work can go live with one language. Many works are expected to be Japanese only.
- To go live: **six tags + main image** (easy to change).
- Empty price = "Price on request". No separate option.
- Size is one value for both languages; materials and medium are written per language.
- Image alt text is generated from the title.

**Collections**
- Artist **adds collections in the admin**. A work can be in **more than one**. Built now, not shown publicly yet.
- The collection graphic is **paused**. The artist will make it later.

**Globe**
- **Plain pin dots** for now; the artist's custom pin image later. Grouping later. Tap → **near full-screen photo**.
- Location: **typed city** only (may get more precise later). City list from GeoNames.
- Photo location data is **not read or used** (decided 2026-10-25: iPhones strip it from web uploads, so a "suggested from your photo" feature would rarely work). The server keeps only a re-encoded copy with no metadata.
- City list: GeoNames places over 1,000 people, with Japanese names. Suggestions show region and country so same-named places can be told apart.
- Upload limits: one photo, JPG/PNG/WebP, 5 per hour and 20 per day per visitor, uploads pause at 400 waiting. Invisible spam check.
- Rejected uploads are **kept in a separate Rejected area**, not deleted.
- Takedown requests go to the artist directly, not through the site.
- **Before uploads go public:** a consent line above Send (no checkbox) and a `/privacy` page, linked from the form and About. Drafts in EN/JA in design spec 11.

**Tokens**
- Colors, type, spacing and motion as in *Design Spec/00 Tokens.md*. Fonts are base fonts and may change.

**Admin**
- One login per person (Steffan, the artist; changed from one shared login on 2026-10-29), no "forgot password" (Steffan resets it). Admin in English or Japanese.
- Opens on the artworks table. Same table + form pattern for artworks and uploads.
- Artwork form starts with the CMS's own layout; switches to the 9c layout if it doesn't look good.
- Review queue: newest first, badge counts everything waiting, decisions save immediately with Undo.
- Delete has a **confirm step**; no recovery.
- **No email alerts** for new uploads (for now).

**Platform**
- Cloudflare Workers paid plan ($5/month) + domain. Built on Steffan's account; fresh setup on the artist's account at go-live.

## Still open

| Item | Owner |
| --- | --- |
| Globe final look (7f) | Artist |
| Custom pin image, and whether it faces the viewer or lies flat | Artist |
| Quiz and feeling icons | Artist |
| Landing image, site-wide share image | Artist |
| Copy: landing line, quiz questions, reveal line, upload text, About | Artist |
| Visitor photos: used on this site only, or also elsewhere (exhibitions, Instagram)? Must be settled **before** the first upload | Artist |
| Privacy page operator line: name/address shown, or "on request" | Artist |
| Review of the consent line and privacy page drafts (design spec 11) | Artist |
| "Ask about this work": can the Instagram message be pre-filled? | Steffan (build) |
| Artwork form: CMS layout or 9c layout | Steffan (after first build) |

## Paused / later

- Collection graphic before All Works (artist to make)
- More precise globe locations
- Pin grouping
- Several matched works instead of one
- Machine translation of artwork text
