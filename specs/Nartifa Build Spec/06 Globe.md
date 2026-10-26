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
| `GET /api/site/globe/pins` | `[{ id, lat, lng }]` for live uploads (city coordinates; spiral offset done in the browser) | 60s |
| `GET /api/site/globe/uploads/{id}` | City name (both languages), comment, image URLs. Live only, else 404 | 60s |
| `GET /api/site/cities?q=&lang=` | Top 8 prefix matches, biggest population first | 1 day |
| `GET /api/site/cities/nearest?lat=&lng=` | Nearest city to rounded coordinates | 1 day |
| `POST /api/site/globe/uploads` | Creates a pending upload | none |

Photos load only when a pin is tapped (design spec 07 Performance).

## City search — Decided

- Data: GeoNames **cities1000** in the `cities` table (02).
- Prefix match on the English or Japanese name, after normalizing (lower case, full-width → half-width).
- Shown as "City, Country" in the visitor's language; Japanese name falls back to English.
- Debounce typing (~200ms). Visitor must pick a suggestion — free text is not accepted.
- Known limitation: most Japanese names are in kanji, so typing hiragana before converting (おおさか) may not match. Typing 大 matches.
- Credit "City data © GeoNames (CC BY 4.0)" at the bottom of About.

## Upload flow — Decided

Steps in the browser, in order:

1. **Choose photo.**
2. **Read GPS** from the original file (small EXIF library) — *before* re-encoding.
   - If present: round to 1 decimal (~10km), call `/cities/nearest`, **pre-fill Place** with a note "Suggested from your photo." The visitor can change it.
   - If absent (common — phones and the Instagram in-app browser often strip location): Place stays empty.
   - Exact coordinates never leave the browser and are never stored.
3. **Re-encode** via canvas: longest side max 2400px, JPEG quality ~0.85. This strips all metadata (incl. GPS) and keeps uploads small.
4. **Place** (required, from suggestions) and **comment** (optional, 140 chars, counter near the limit).
5. **Turnstile** token (usually invisible; leave room for a small checkbox under Send).
6. **Send** → `POST` with photo, `cityId`, comment, token.

Raw HEIC files that the browser can't decode → "Please use JPG or PNG" under the field.

This **reverses** "Photo GPS data is not read or used" in the design spec and Open Decisions — update both.

## Server checks on `POST` — Decided

In this order; any failure returns an error line for the form (form stays filled):

| Check | Rule |
| --- | --- |
| Turnstile | Token verified with `TURNSTILE_SECRET_KEY` |
| Rate limit | Max **5 per hour** and **20 per day** per `ipHash` (counted in D1) |
| Queue cap | If **400 or more** uploads are pending → "Please try again later" |
| File | Max 5MB; type checked from the file's bytes (JPEG/PNG/WebP); one photo |
| City | `cityId` exists in `cities` |
| Comment | Trimmed, max 140, stored as plain text |

On success: store the photo in `globe-photos`, create `globe-uploads` with `status = pending`, copy the city names and coordinates. The visitor sees the Thank you state and does **not** see their pin (design spec 7e).

Limits live in `src/config/limits.ts`.

`ipHash = SHA-256(IP + IP_HASH_SALT)`. Raw IPs are never stored.

## Not in v1

- Automatic moderation (Deferred)
- Pin grouping (Deferred)
- More precise locations than city (Deferred)
- Email alerts for new uploads (Decided: none for now)
