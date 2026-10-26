# 05 Images

## How it works — Decided

**Every size of every image is made once, when the image is uploaded, and kept in R2.** Visitors are only ever served those stored files.

1. The artist uploads an image in `/admin`. Payload stores the **original** in R2 (`media/`) and a record (filename, width, height) in D1.
2. When a file is uploaded or replaced, hooks on `media` and `globe-photos` make every named size the image needs, through the **Images binding** (`env.IMAGES.input(…).transform(…).output(…)`):
   - `beforeChange`: transform the uploaded bytes (`req.file.data`) into every size and keep the results in `req.context`. If any size fails (e.g. the image is too large for the service), **throw**: the upload is rejected with a clear message in the admin and nothing is saved. A broken image never reaches the site. (This is before the save on purpose — D1 has no transactions, so an error after the save couldn't undo it.)
   - `afterChange`: the id now exists; write each result to R2 at `derived/{collection}/{id}/{size}.webp`, overwriting any older version.
3. Public pages request a named size through the image route: `/img/{collection}/{id}/{size}?v={updatedAt}`.
4. The route checks the image may be shown (below), reads `derived/…` from R2 and returns it. No transform on the visitor's request.
   - If a derived file is missing (e.g. after adding a new size to the config), the route makes it from the original, stores it, then serves it. Self-healing; nothing to backfill by hand.
5. `afterDelete` on `media` / `globe-photos` deletes the original and its `derived/` files.

Payload's usual `sharp` resizing is not used (it can't run in Workers).

### Why this way

- **Cost is fixed:** each size of each image is transformed exactly once. The binding is billed per *unique* transformation per calendar month (format and quality don't count), so even repeat generation wouldn't add cost — but stored files mean it never happens.
- **Nothing depends on an edge cache:** works the same on `workers.dev` during the build and on the custom domain.
- **The binding reads private bytes directly.** `fetch` with image options would need the original at a public URL, which the private bucket rules out.
- **Errors surface to the artist at upload**, not to a visitor.

### Not used: Workers Cache

Cloudflare's Workers Cache (`"cache": { "enabled": true }` in wrangler config) could serve images from the edge without running the Worker. It is **not enabled**, because it applies to the whole Worker and caches any response by path: Next.js sends cacheable headers on cached pages, so HTML would be cached by URL alone and visitors would get the wrong language (08). Every image request therefore runs the Worker for one R2 read — fine at this traffic (Workers Paid includes 10M requests a month). Revisit only with a verified way to keep HTML out of it.

## Sizes — Decided

All output **WebP, quality 85.** Cloudflare's docs state WebP output always discards all metadata, so no EXIF or location data is ever served. One format only: AVIF wouldn't cost more, but it would double the stored files and need `Vary: Accept`, for little gain.

| Name | Size | Fit (binding `fit`) | Used for |
| --- | --- | --- | --- |
| `thumb` | 200×200 | `cover` — exact square | Thumbnails under the main image (5e), admin tables, review queue |
| `card` | 600×600 | `cover` — exact square | All Works grid (mobile and desktop) |
| `md` | 800 wide | `scale-down` — natural shape, never upscaled | Artwork and globe photo on phones |
| `lg` | 1600 wide | `scale-down` | Artwork on desktop, reveal, globe photo on desktop |
| `xl` | 2400 wide | `scale-down` | Full-screen artwork viewer only |
| `og` | 1200×630 | `pad`, background `#0D0D0D` | Social share image — padded so the artwork is never cropped |

| Name | Size | Fit | Used for |
| --- | --- | --- | --- |
| `thumb` | 200×200 | square crop | Thumbnails under the main image (5e), admin tables, review queue |
| `card` | 600×600 | square crop | All Works grid (mobile and desktop) |
| `md` | 800 wide | natural shape | Artwork and globe photo on phones |
| `lg` | 1600 wide | natural shape | Artwork on desktop, reveal, globe photo on desktop |
| `xl` | 2400 wide | natural shape | Full-screen artwork viewer only |
| `og` | 1200×630 | fit inside, padded `#0D0D0D` | Social share image — padded so the artwork is never cropped |

Natural-shape sizes never upscale: a small original keeps its own dimensions. The square sizes and `og` always come out at their exact size.

Artwork and photo views use `srcset` with `md` and `lg` (`sizes` set per layout). Sizes are defined in `src/config/images.ts`; the URL builder in `lib/images.ts` only accepts these names.

### Which images get which sizes

| Image | Sizes |
| --- | --- |
| Artwork main image | all six |
| Artwork extra images | `thumb`, `md`, `lg`, `xl` |
| Globe photos | `thumb`, `md`, `lg` |
| Landing image | none — a static file in the code, sized by hand |

### Cost check

Transformations happen only at upload, so this is a count of uploads, not of visits. About 100 works × (6 + 3 extra × 4) ≈ 1,800 in total, spread over the months the artist uploads, plus 4 per globe photo (clean copy + 3 sizes). The first 5,000 unique transformations each month are included. Adding a size means one transformation per existing image the first time it's requested — check the count before adding.

## Privacy and access — Decided

- **The R2 bucket is private.** Originals are never served publicly; nobody can download the artist's full-resolution files.
- The image route checks, in order:
  1. `collection` is `media` or `globe-photos`, and `size` is one that collection has (table above). Else 404.
  2. `media`: always allowed (artworks only appear on the site when live; images of hidden works are low risk).
  3. `globe-photos`: allowed if its upload is `live` — one plain D1 query, no Payload. Otherwise allowed **only** for a logged-in admin (`payload.auth({ headers })`; this starts Payload, but only admins ever reach it). Everyone else gets 404.
- Hiding or rejecting a live photo takes effect on the next request: there is no shared cache holding it (see Workers Cache above).

## Placeholders

`width` and `height` are stored for every image so placeholders (`surface-2` blocks) have the right shape before the image loads (design spec 05, 06).

- **Checked (Payload 3.92):** without `sharp`, Payload still records width and height, read from the file header (its `probeImageSize`, using the `image-dimensions` package).
- **But it ignores EXIF rotation.** A portrait phone photo saved as landscape pixels plus a "rotate 90°" tag gets recorded as landscape, while the Images binding outputs it upright. The placeholder would have the wrong shape.
- **Fix:** in the same `beforeChange` hook that makes the sizes, call the binding's free `info()` on the `lg` output. If its shape (portrait vs landscape) differs from the recorded `width`/`height`, swap them. The stored shape then always matches what the binding actually serves, with no EXIF library on the server.
- Globe photos are stored as an upright WebP re-encode to begin with (06), so the check is a no-op for them.

## Cache headers

| Image | `Cache-Control` |
| --- | --- |
| `media` | `public, max-age=31536000, immutable` |
| `globe-photos`, public | `private, max-age=86400` — a hidden photo can stay in a viewer's own browser for up to a day, never in a shared cache |
| Any image served to an admin because it isn't live | `private, no-store` |

`?v={updatedAt}` in the URL changes when an image is replaced, so browsers never show a stale version.

## Alt text — Decided

Generated, no admin field:

| Image | Alt |
| --- | --- |
| Artwork | Title in the current language (with fallback), else i18n "Artwork by NARTIFA" |
| Extra images | Same, plus "(2 of 4)" |
| Globe photo | i18n "Photo from {city}" |
| Landing | Fixed i18n string |

## Upload rules

| | Artworks (admin) | Globe photos (visitors) |
| --- | --- | --- |
| Types | JPG, PNG, WebP | JPG, PNG, WebP (iPhone Safari converts HEIC to JPEG) |
| Max size | 20MB — Payload `upload.limits.fileSize: 20_000_000`. Matches the Images binding's 20 MB input limit | 5MB on the server; the browser re-encodes first (see 06) |
| Too large in pixels for the binding | Upload rejected at the generate-sizes step, with a message to export a smaller file | Not possible — browser caps the long side at 2400px |
| Metadata | Stripped on output (WebP drops all metadata) | Stripped in the browser, **and** the server stores only its own WebP re-encode, never the visitor's bytes (06) |
