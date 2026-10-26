# 05 Images

## How it works — Decided

1. The artist uploads an image in `/admin`. Payload stores the **original** in R2 and a record (filename, width, height) in D1.
2. Public pages request a **named size** through the image route: `/img/{collection}/{id}/{size}?v={updatedAt}`.
3. The route checks the image may be shown, reads the original from R2, transforms it with Cloudflare Image Transformations and returns it with long cache headers.
4. The edge caches each result. Each size of each image is made once; later requests come from cache.

Payload's usual `sharp` resizing is not used (it can't run in Workers). Only originals are stored.

**Verify:** the exact mechanism for transforming a private R2 object from the Worker (Images binding vs `fetch` with image options), and that the chosen mechanism is billed per *unique* transformation.

## Sizes — Decided

All output **WebP, quality 85, metadata stripped.** One fixed format (no auto AVIF/WebP), because each format counts as a separate transformation.

| Name | Size | Fit | Used for |
| --- | --- | --- | --- |
| `thumb` | 200×200 | square crop | Thumbnails under the main image (5e), admin tables, review queue |
| `card` | 600×600 | square crop | All Works grid (mobile and desktop) |
| `md` | 800 wide | natural shape | Artwork and globe photo on phones |
| `lg` | 1600 wide | natural shape | Artwork on desktop, reveal, globe photo on desktop |
| `xl` | 2400 wide | natural shape | Full-screen artwork viewer only |
| `og` | 1200×630 | fit inside, padded `#0D0D0D` | Social share image — padded so the artwork is never cropped |

Never upscale: if the original is smaller than the size, return the original's dimensions.

Artwork and photo views use `srcset` with `md` and `lg` (`sizes` set per layout). Sizes are defined in `src/config/images.ts`; the URL builder in `lib/images.ts` only accepts these names.

### Which images get which sizes

| Image | Sizes |
| --- | --- |
| Artwork main image | all six |
| Artwork extra images | `thumb`, `md`, `lg`, `xl` |
| Globe photos | `thumb`, `md`, `lg` |
| Landing image | none — a static file in the code, sized by hand |

### Cost check

About 100 works × (6 + 3 extra × 4) ≈ 1,800, plus about 3 per globe photo → a few thousand per month, under the free 5,000. Adding sizes or formats raises this — check before adding.

## Privacy and access — Decided

- **The R2 bucket is private.** Originals are never served publicly; nobody can download the artist's full-resolution files.
- The image route serves:
  - `media`: any size (artworks only appear on the site when live; images of hidden works are low risk).
  - `globe-photos`: **only when the upload is `live`.** Pending, hidden and rejected photos return 404 publicly.
- Admin views load images through an authenticated route, so the artist can see pending photos.

## Placeholders

`width` and `height` are stored for every image so placeholders (`surface-2` blocks) have the right shape before the image loads (design spec 05, 06).

**Verify:** Payload records width/height without `sharp`. If not, read them from the file header on upload.

## Cache headers

- Transformed images: `Cache-Control: public, max-age=31536000, immutable`.
- `?v={updatedAt}` in the URL changes when an image is replaced, so stale versions are never served.

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
| Max size | 20MB (Proposed) | 5MB on the server; the browser re-encodes first (see 06) |
| Metadata | Stripped on output | Stripped **before upload** in the browser |
