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

### In the repo (2026-10-30)

| Piece | Where |
| --- | --- |
| Sizes, which collection gets which, limits, cache headers | `src/config/images.ts` |
| URL builder, `derived/` keys, route path check, pixel limit, orientation decision (pure) | `src/lib/images.ts` |
| Running the binding (`makeSize`, `makeSizes`, `outputDimensions`, error 9413) | `src/lib/image-transform.ts` |
| The three hooks, per collection: `imageSizeHooks('media')` | `src/hooks/image-sizes.ts` |
| Image route | `src/app/img/[...path]/route.ts` |
| Bindings for hooks and route (Worker or local proxy) | `src/lib/cloudflare.ts` |

- Wired to `media` only. `globe-photos` is added to `IMAGE_COLLECTIONS` in the globe phase; until then `/img/globe-photos/…` is a 404.
- The hooks only run when a file comes with the save (`req.file`): an upload or a replaced file. Saving other fields leaves the sizes alone.
- **Hook order is safe:** the R2 plugin stores the original in its own `afterChange`, after ours. A rejection in `beforeChange` leaves no record and no original.
- The R2 plugin deletes the original on delete; our `afterDelete` removes `derived/{collection}/{id}/`.
- Writes to R2 go as a `Blob`: a typed array doesn't survive the local dev proxy (workers-sdk#6047; the R2 plugin does the same).
- The route's rebuild finds the original with one plain D1 query (`SELECT filename, prefix FROM media WHERE id = ?`; key `{prefix}/{filename}`), with no Payload.
- **Admin previews** use `preview` through the route (`upload.adminThumbnail`), so the admin never loads the original and never crops an image (changed from `thumb` 2026-10-30, hand test: the image page showed a square crop). `custom.scss` shows Payload's previews uncropped too. The artworks table keeps its 40px square from `thumb`.
- The rejection messages are `admin.images.tooLarge` / `admin.images.failed` in `ja.json` / `en.json`, shown in the admin's language.
- The binding works in `pnpm dev` and tests through wrangler's local proxy (checked 2026-10-30), so the whole pipeline is tested locally: `tests/int/images.int.spec.ts` (sizes, orientation, 144 MP rejection, replace, delete, route serve/rebuild/404s) and `tests/e2e/media-access.e2e.spec.ts` (`/img` public through the dev server).

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
| `thumb` | 200×200 | `cover` — exact square | Thumbnails under the main image (5e), artworks table, review queue |
| `preview` | within 400×400 | `scale-down` — whole image, never cropped or upscaled | Admin image previews (image page, Images list, image fields on a work) |
| `card` | 600×600 | `cover` — exact square | All Works grid (mobile and desktop) |
| `md` | 800 wide | `scale-down` — natural shape, never upscaled | Artwork and globe photo on phones |
| `lg` | 1600 wide | `scale-down` | Artwork on desktop, reveal, globe photo on desktop |
| `xl` | 2400 wide | `scale-down` | Full-screen artwork viewer only |
| `og` | 1200×630 | `pad`, background `#0D0D0D` | Social share image — padded so the artwork is never cropped |

| Name | Size | Fit | Used for |
| --- | --- | --- | --- |
| `thumb` | 200×200 | square crop | Thumbnails under the main image (5e), artworks table, review queue |
| `preview` | within 400×400 | whole image | Admin image previews |
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
| Artwork images (`media`), main or extra | all seven — Decided 2026-10-30: an image doesn't know at upload whether it will be a main or an extra image, and the artist can swap them later |
| Globe photos | `thumb`, `md`, `lg` |
| Landing image | none — a static file in the code, sized by hand |

### Cost check

Transformations happen only at upload, so this is a count of uploads, not of visits. About 100 works × 4 images × 7 sizes ≈ 2,800 in total, spread over the months the artist uploads, plus 4 per globe photo (clean copy + 3 sizes). The first 5,000 unique transformations each month are included. Adding a size means one transformation per existing image the first time it's requested — check the count before adding.

## Privacy and access — Decided

- **The R2 bucket is private.** Originals are never served publicly; nobody can download the artist's full-resolution files.
- Payload's own file route (`/api/media/file/…`) is closed too: `media` read access is logged-in only (02). Checked by `tests/e2e/media-access.e2e.spec.ts`: logged out, record and file are 403.
- The image route checks, in order:
  1. `collection` is `media` or `globe-photos`, and `size` is one that collection has (table above). Else 404.
  2. `media`: always allowed (artworks only appear on the site when live; images of hidden works are low risk).
  3. `globe-photos`: allowed if its upload is `live` — one plain D1 query, no Payload. Otherwise allowed **only** for a logged-in admin (`payload.auth({ headers })`; this starts Payload, but only admins ever reach it). Everyone else gets 404.
- Hiding or rejecting a live photo takes effect on the next request: there is no shared cache holding it (see Workers Cache above).

## Binding checked on Cloudflare (2026-10-30)

A throwaway Worker ran the six sizes above (WebP q85, same `fit` options) on Cloudflare's network (`wrangler dev --remote`) and in the local runtime, with a phone-style JPEG (stored 4032×3024 sideways + EXIF Orientation 6, camera make/model, GPS), a 300×200 PNG and a 12000×12000 JPEG.

| | Cloudflare | Local runtime (`pnpm dev`, Miniflare + `sharp`) |
| --- | --- | --- |
| Orientation | Every size upright (portrait: `md` 800×1066, `lg` 1600×2133, `xl` 2400×3200) | Same (`md` 800×1067) |
| Metadata | No EXIF in any output (camera and GPS gone) | Same |
| Small image | `md`/`lg`/`xl` stay 300×200; `thumb`, `card`, `og` exact size | Same |
| `info()` on the phone JPEG | **3024×4032** — reports the upright shape | **4032×3024** — reports the stored, sideways shape |
| 12000×12000 (144 MP) | **Rejected:** `info()` and every transform throw code `9413`, "Maximum dimension allowed is 50000 and maximum area allowed is 100000000" | Processed without complaint — **no limit locally** |

Consequences for the build:
- The orientation fix below (compare the `lg` **output's** shape with the recorded width/height) works in both. Don't rely on `info()` of the original: it differs between local and live.
- **Check the pixel limit in our own hook** (area > 100,000,000 or a side > 50,000 → reject with the "export a smaller file" message) before calling the binding, so the rejection behaves the same in `pnpm dev` and live. Still map error `9413` from the binding to the same message, as a backstop.

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
| Max size | 20MB — Payload `upload.limits.fileSize`, from `UPLOAD_LIMITS` in `src/config/images.ts`. Matches the Images binding's 20 MB input limit. Checked in the browser before sending (see below) | 5MB on the server; the browser re-encodes first (see 06) |
| Too large in pixels for the binding (over 100 megapixels or a side over 50,000px — checked above) | Upload rejected at the generate-sizes step, with a message to export a smaller file | Not possible — browser caps the long side at 2400px |
| Metadata | Stripped on output (WebP drops all metadata) | Stripped in the browser, **and** the server stores only its own WebP re-encode, never the visitor's bytes (06) |

**Artwork upload checks in the admin (2026-10-30, hand test).** A file over 20 MB used to fail with only "NetworkError": the server refuses it (413) within a fraction of a second, but the browser is still sending and only sees the connection drop. And a HEIC file got Payload's "The following field is invalid: file". Now:
- `src/admin/UploadGuard.tsx` (an admin provider) checks every picked or dropped file before Payload sees it: not JPG/PNG/WebP, or over 20 MB → a toast saying why, and the file goes nowhere. It listens on `window` in the capture phase, so it also covers Payload's own drop zones.
- `src/admin/media/FileCheck.tsx` (a ui field in the image form) does the same for a file that arrives another way (pasted, "Paste URL").
- `checkUploadedFile` (`beforeOperation` on `media`, `src/hooks/media.ts`) refuses the same files on the server, with the same message, for anything that gets past the browser.
- The check is `fileProblem` in `src/lib/images.ts`; messages `admin.upload.wrongType` / `tooBig` in `ja.json` / `en.json`. The pixel limit stays in the size hook (above).
