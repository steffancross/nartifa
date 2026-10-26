# 06 Globe

Design spec 07 (public) and 10 (admin). This file covers the build.

## three.js scene — Decided

three.js directly, no wrapper library. Loaded only on `/globe` (dynamic import), so no other page pays for it.

### Sphere and land

- Sphere: low-poly sphere, unlit material in a dark tone from the tokens.
- **Land is a pre-drawn texture**, not live geometry. `scripts/build-globe-texture.ts` draws Natural Earth low-detail land (public domain) onto a 2048×1024 equirectangular image — fills, outlines or both — and saves it as a static asset.
- One draw call; no map data loads at runtime.
- The final look (design spec 7f) is still to confirm with the artist. Changing it = regenerate the texture.

### Pins

- All pins are **one `THREE.Points` object** (one draw call, any number of pins).
- **For now:** plain white dots (`pin` token, about 6px).
- **Later:** the artist's custom PNG (square, transparent, delivered at 128×128, shown at about 16–24px). Keep the pin material in one place so it can switch to a textured sprite (always facing the viewer) or flat on the surface (instanced planes). Both stay one draw call.
- **Same-city pins:** spread in a small spiral around the city's coordinates, ordered by upload id, so positions are stable. Known limitation: fully zoomed out, same-city pins still overlap and a tap opens the nearest. Pin grouping is Deferred.

### Picking (tap a pin)

- Screen-space: project pin positions to the screen, take the nearest within **22px** of the tap (44px tap area).
- Ignore pins on the far side of the globe.
- Distinguish a tap from a drag (movement under ~6px).

### Controls

- three.js orbit controls: rotate and zoom with limits, **no pan**, light damping.
- Slow auto-rotate until the first touch (Proposed in the design).
- Pause rendering when the tab is hidden.
- `prefers-reduced-motion`: no auto-rotate.

### Loading and fallback

- Show the dark circle outline while loading, then fade in the globe (design spec 07).
- No WebGL → flat message + Share button.

## Endpoints

| Route | Returns | Cache |
| --- | --- | --- |
| `GET /api/site/globe/pins` | `[{ id, lat, lng }]` for live uploads (city coordinates; spiral offset done in the browser) | Data cached, `globe` tag (08) |
| `GET /api/site/globe/uploads/{id}` | City name (both languages), comment, image URLs. Live only, else 404 | Data cached, `globe` tag (08) |
| `GET /api/site/cities?q=&lang=` | Top 8 prefix matches, biggest population first. Plain D1 query | 1 day |
| `POST /api/site/globe/uploads` | Creates a pending upload (Payload local API) | none |

Approving, hiding or rejecting an upload clears the `globe` tag, so the pin appears or disappears on the next globe load.

Photos load only when a pin is tapped (design spec 07 Performance).

## City search — Decided

- Data: GeoNames **cities1000** with English and Japanese names, in the `cities` table (02).
- **Normalizing:** one function, `lib/normalize.ts`, used by both the import script and the endpoint so stored and typed text can never be normalized differently.
  - Latin: NFKC (full-width → half-width), lower case, accents removed (`são` → `sao`).
  - Japanese: NFKC (half-width kana → full-width), **hiragana → katakana**.
- **Which column:** a query containing any kana or kanji searches `search_ja`; anything else searches `search_en`. Minimum 2 characters for Latin, 1 for Japanese.
- **Query** (uses the index; `LIKE` would not, since it's case-insensitive):
  ```sql
  SELECT … FROM cities
  WHERE search_en >= ?1 AND search_en < ?1 || char(1114111)
  ORDER BY population DESC LIMIT 8
  ```
- **Suggestion row:** city name, then region and country in `text-2` ("Fuchu — Tokyo, Japan"), in the visitor's language with English fallback per part. Picking one stores "City, Country" in both languages (02).
- Debounce typing (~200ms). Visitor must pick a suggestion — free text is not accepted. No match → "Try a nearby city".
- **Known limitation:** Japanese place names are mostly kanji, so typing a Japanese city in hiragana before converting (おおさか) doesn't match; typing 大阪 does. World cities are stored in katakana, so hiragana works for them (ぱり → パリ).
- Credit "City data © GeoNames (CC BY 4.0)" at the bottom of About.

## Upload flow — Decided

Steps in the browser, in order:

1. **Choose photo.** The photo's location data is not read (design spec 07).
2. **Re-encode** via canvas: longest side max 2400px, JPEG quality ~0.85. This strips all metadata and keeps uploads small. (The server re-encodes again and stores only its own copy — see below.)
3. **Place** (required, from suggestions, starts empty) and **comment** (optional, 140 chars, counter near the limit).
4. **Turnstile** token (usually invisible; leave room for a small checkbox under Send).
5. **Send** → `POST` with photo, `cityId`, comment, token.

Raw HEIC files that the browser can't decode → "Please use a JPG, PNG or WebP photo" under the field.

## Server checks on `POST` — Decided

In this order; any failure returns an error line for the form (form stays filled):

| Check | Rule |
| --- | --- |
| Turnstile | Token verified with `TURNSTILE_SECRET_KEY` |
| Rate limit — visitor | Max **5 per hour** and **20 per day** per visitor (browser cookie — see Rate limits below) |
| Rate limit — network | Max **60 per hour** and **200 per day** per IP (IPv6: per /64). A backstop only |
| Queue cap | If **400 or more** uploads are pending → "Please try again later" |
| File | Max 5MB; type checked from the file's bytes (JPEG/PNG/WebP); one photo |
| City | `cityId` exists in `cities` |
| Comment | Trimmed, max 140, stored as plain text |

### Clean copy on the server — Decided

The browser's re-encode can't be trusted: anyone can send the `POST` directly with a photo that still carries GPS data. So **the visitor's bytes are never stored.**

- After the checks above, the handler passes the received bytes through the Images binding: long side ≤ 2400 (`fit: scale-down`), output **WebP, quality 85**. WebP output always drops all metadata (Cloudflare docs), so GPS, camera and date data are gone no matter what was sent.
- That WebP is what gets stored as the `globe-photos` file (`payload.create` with the clean bytes). The named sizes are then made from it like any image (05).
- If the binding can't decode the bytes, the upload fails with "Please use a JPG, PNG or WebP photo". This also rejects files that only pretend to be images.
- Cost: one extra transformation per upload (4 per globe photo in total).

On success: store the clean photo in `globe-photos`, create `globe-uploads` with `status = pending`, copy the city names and coordinates. The visitor sees the Thank you state and does **not** see their pin (design spec 7e).

Limits live in `src/config/limits.ts`.

## Rate limits — Decided

**The problem with per-IP limits alone:** many people can share one IP. At an exhibition with a QR code, everyone on the venue Wi-Fi is one IP. Mobile carriers also put many phones behind shared IPs. "5 per hour per IP" would let 5 people in the room upload, then block everyone else.

**So the design's "per visitor" means per browser, with a high per-IP ceiling behind it:**

| Layer | Stops | Limit |
| --- | --- | --- |
| Turnstile | Bots and scripts | Every upload needs a fresh token |
| Visitor cookie | One person sending too many | 5 / hour, 20 / day (design spec 07) |
| Network (IP) | A script that clears cookies between uploads | 60 / hour, 200 / day — far above any real room of people |
| Queue cap | Anything that gets through | Uploads pause at 400 pending |

**Visitor cookie**
- Name `v`, a random 128-bit id. Set by the upload `POST` response on the visitor's **first** upload, so browsing the site never sets a cookie.
- `HttpOnly; Secure; SameSite=Lax; Path=/api/site/globe; Max-Age` 1 year. Set by the server, so Safari doesn't shorten its life.
- Not signed: clearing cookies is as easy as faking one, so a signature adds nothing. The network limit covers that case.
- Not a tracker: it's only ever sent to the upload endpoint, and it's never linked to the upload it came with (see storage below).

**Network key**
- IPv4: the full address. IPv6: the first 64 bits, since one phone can hold a whole /64 and rotate through it.
- Stored only as `SHA-256(key + IP_HASH_SALT)`. Raw IPs are never stored.

**Storage — `upload_attempts` (plain D1 table, 02)**
- One row per successful upload per key: `(kind, keyHash, createdAt)`, where `kind` is `visitor` or `ip`. Both are hashed with `IP_HASH_SALT`.
- Each check is a count over the last hour and the last 24 hours.
- Every `POST` first deletes rows older than 24 hours. The table never holds more than a day of history and needs no cron job.
- **Kept apart from `globe-uploads`:** a stored photo carries no IP hash or visitor id at all. After 24 hours, nothing links an upload to a network or browser.

**Messages:** visitor limit → the design's error line above Send. Network limit → "Please try again later" (same as the queue cap), since the visitor can't do anything about it.

**If a flood gets through anyway:** the artist selects the rows in the Submissions table and sets them to Rejected in one go (Payload's bulk edit), which also reopens the queue.

## Not in v1

- Automatic moderation (Deferred)
- Pin grouping (Deferred)
- More precise locations than city (Deferred)
- Email alerts for new uploads (Decided: none for now)
