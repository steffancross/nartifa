# 02 Data Model

All Payload collections live in D1. Files live in R2. Fields marked **loc** are Payload localized fields with `ja` (default) and `en` values.

Payload localization: locales `ja`, `en`; default `ja`; fallback on (see 03 for how fallback is detected per field).

## `artworks`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | number (auto) | **Used as the URL slug**: `/works/12`. Permanent: never changes, never reused — see Permanent links below |
| `live` | checkbox | The artist's toggle — what they *want*. Only the artist changes it; no hook ever unticks it |
| `status` | select, read-only | Computed on save: `live` / `hidden` / `incomplete` |
| `missing` | text list, read-only | Computed on save, e.g. `["smell", "feeling", "mainImage"]` |
| `sight` `smell` `taste` `touch` `hearing` | select: `a` / `b` | Words come from i18n (`quiz.sight.a` = "nature"…) |
| `feeling` | select: `joy` / `anger` / `sorrow` / `delight` | |
| `mainImage` | upload → `media` | |
| `extraImages` | upload → `media`, many, ordered | Drag to reorder |
| `title` | text, **loc** | |
| `description` | textarea, **loc** | Plain text; blank lines = paragraphs (Proposed) |
| `price` | number, whole | JPY. Empty = "Price on request" |
| `size` | text | **Not localized** — one shared value |
| `materials` | text, **loc** | |
| `medium` | text, **loc** | |
| `year` | number | 4 digits |
| `series` | relationship → `series`, many | Labelled "Collections". Can create a new collection from the field |
| `searchText` | text, hidden, read-only | Both titles, lower-cased, for admin search (07). Filled by the hook |
| `createdAt` / `updatedAt` | auto | `createdAt` = "date added", used for "newest first" |

### Status rule — Decided (easy to change)

Computed in a `beforeChange` hook, so it can be filtered and sorted:

```
required = [sight, smell, taste, touch, hearing, feeling, mainImage]
missing  = required fields that are empty
status   = !live            → hidden
           missing nonEmpty → incomplete
           otherwise        → live
```

- Only `status = live` works appear on the public site and in matching.
- The required list is one array in code (`src/config/artworks.ts`, `REQUIRED_FIELDS`); the rule is `computeStatus` in `src/lib/artwork-status.ts`. Changing what is required means editing that array and re-saving.
- The hook runs on the **whole** work (stored document + the change), so a save that only flips Live still sees every other field.
- **Deleting an image is always allowed — Decided (2026-10-30).** A work that used it as its main image comes off the site: a `beforeDelete` hook on `media` notes which works use it, and an `afterDelete` hook re-saves each with no main image, so it becomes `incomplete` with `mainImage` missing. **Live stays ticked**, so choosing a new main image puts the work straight back, the same as when any other required field is cleared. (The database empties the field by itself — `main_image_id … ON DELETE set null` — but that alone wouldn't recompute the stored status.) Extra images need nothing: the database drops a deleted image from the list, and they don't affect status. Code: `src/hooks/media.ts`.

### Permanent links — Decided

`/works/12` always means the same work. If that work is deleted, the link shows "no longer available" forever (03); it never starts pointing at a different work.

**The risk:** by default SQLite gives a new row "highest id + 1". Delete the newest work (id 12) and the next new work gets 12 again, so old shared links would open the wrong work.

**Checked (Payload 3.92):** `@payloadcms/db-d1-sqlite` has an `autoIncrement` option, **off by default**. With it on, primary keys are created with SQLite's `AUTOINCREMENT`, which never hands out an id that was used before, even after deletes.

- Set `sqliteD1Adapter({ …, autoIncrement: true })` in `payload.config.ts` **before the first migration is generated**. SQLite can't add `AUTOINCREMENT` to an existing table, so turning it on later means rebuilding tables.
- It applies to every collection. Harmless, and it also keeps globe upload ids from being reused.
- Payload's helper tables (`*_rels`, `*_locales`, `*_texts`, e.g. `artworks_rels`, `artworks_locales`) don't get it. Fine: their rows are never linked to.
- **Done (2026-10-28):** set in `payload.config.ts`; the template's own migration (generated without it) was deleted and `src/migrations/*_initial.ts` regenerated, so every table is created with `AUTOINCREMENT` from the first migration on.
- Ids are not editable in the admin and nothing else is ever used in the URL, so a work's link can't change.
- The go-live database starts fresh at 1. That's fine: build-time links are on `workers.dev`, a different address, so none of them can point at the new site.
- If the database is ever moved by export/import rather than Cloudflare's own restore, check that the next new id is higher than every existing one before going live again.

Confirmed in Phase 0 (09): create works 1–3, delete 3, create one more — it must get 4. `artworks` only exists from Phase 1, so Phase 0 runs the same test on `media` (the setting is adapter-wide), and Phase 1 repeats it on `artworks`.

## `series` (shown as "Collections")

The artist and the design call these **collections**. In code the slug is `series`, because `collections` is already Payload's word for every content type. With that slug, the admin URL would be `/admin/collections/collections` and the code would say `collection: 'collections'`. The admin labels stay "Collections" / "コレクション", so the artist never sees the word "series".

| Field | Type | Notes |
| --- | --- | --- |
| `nameJa` | text, required | Japanese name |
| `nameEn` | text, required | English name |
| `slug` | text, unique, read-only | From `nameEn`; for the future collection graphic |

Not shown on the public site in v1 (the graphic is paused). Built now so the data is ready.

**Two required names, not one localized field — Decided (2026-10-30).** Both names must be given when a collection is added, including from the picker on a work. Payload's form shows one language at a time, so a localized `name` couldn't require both at once; two plain fields can. The public site will pick `nameJa` / `nameEn` by language. The admin shows collections by `nameJa` (`useAsTitle`); the list search covers both names.

**Slug — Decided (2026-10-30):** made from the English name by `slugify` (`src/lib/slug.ts`): lower-case, accents dropped, anything else that isn't a–z or 0–9 becomes `-` ("Night Garden (II)" → `night-garden-ii`); `collection` if nothing is left. A clash gets `-2`, `-3`…. It **follows the English name** on every save (`src/hooks/series.ts`), since nothing links to it yet. When the graphic ships and slugs appear in URLs, decide whether to freeze them like work ids.

**In the repo (2026-10-30):** `src/collections/Series.ts` and `src/collections/Artworks.ts`, migration `20261030_182139_collections` (both main tables `AUTOINCREMENT`; checked by `tests/int/artworks-ids.int.spec.ts`). `missing` is a Payload `text` field with `hasMany` (stored in `artworks_texts`). The six select fields store the keys from `src/config/quiz.ts`; their admin labels are read from `quiz.*` in `ja.json`/`en.json` (`src/i18n/admin-labels.ts`). The migration was regenerated (first generated as `20261030_155951_collections`) when `series.name` became `nameJa` / `nameEn` (it had never reached the real D1).

**Hooks in the repo (2026-10-30):** `src/hooks/artworks.ts` (status, missing, searchText), `src/hooks/media.ts` (main image delete), `src/hooks/series.ts` (slug). Unit tests for the pure functions; `tests/int/hooks.int.spec.ts` checks each hook against the local database.

## `media` (artwork images)

Payload upload collection, stored in R2 under `media/`.

| Field | Type | Notes |
| --- | --- | --- |
| `width`, `height` | number | Filled by Payload from the file header (no `sharp` needed — checked). Swapped by our hook for rotated phone photos (05) |
| `filename`, `mimeType`, `filesize` | auto | |

- Accepted: JPG, PNG, WebP. Max 20MB (Proposed).
- No `sharp` resizing — sizes are made by the Images binding at upload and stored under `derived/` (05).
- No alt field — alt text is generated (05). (The template's required `alt` was dropped in migration `20261030_182139_collections`.)
- **Read access: logged-in admins only.** The template allowed anyone, which let `/api/media/file/<name>` serve full-resolution originals (05, Privacy). Public pages use Payload's local API, which skips access rules, so the site is unaffected.
- Stored under `media/` via the R2 plugin's `prefix` option, which adds a `prefix` column (default `'media'`).

## `globe-photos`

Separate upload collection for visitor photos, so they never mix with artworks. Same fields as `media`. Stored in R2 under `globe-photos/`. The stored file is always the server's own WebP re-encode, never the visitor's original bytes (06).

## `globe-uploads`

| Field | Type | Notes |
| --- | --- | --- |
| `photo` | upload → `globe-photos` | One per upload |
| `cityId` | number | GeoNames id |
| `cityNameEn`, `cityNameJa` | text | Copied from `cities` at upload time, incl. country (e.g. "Osaka, Japan" / "大阪, 日本") |
| `lat`, `lng` | number | **City** coordinates, never the photo's |
| `comment` | text, max 140 | Plain text as typed, not localized |
| `status` | select: `pending` / `live` / `hidden` / `rejected` | Default `pending` |
| `seenAt` | date, nullable | Drives the New dot in the queue |
| `createdAt` | auto | "Sent" time |

The city name and coordinates are copied onto the upload so pins and tables need no lookup. An upload stores **no IP and no visitor id**. Rate limits use their own short-lived table (below).

## `upload_attempts` (plain D1 table, outside Payload)

Rate-limit counts for globe uploads (06). Rows older than 24 hours are deleted on every upload, so it never holds more than a day.

| Column | Notes |
| --- | --- |
| `kind` | `visitor` or `ip` |
| `keyHash` | `SHA-256(key + IP_HASH_SALT)` — the visitor cookie id, or the IP (IPv6: its /64) |
| `createdAt` | Unix seconds |

Own SQL migration, like `cities`.

## `cities` (plain D1 table, outside Payload)

GeoNames **cities1000**: every place over 1,000 people plus administrative seats, about 150k rows, with English and Japanese names for the city, its region and its country.

| Column | Notes |
| --- | --- |
| `id` | GeoNames id |
| `name_en` | Preferred English alternate name, else GeoNames `name` |
| `name_ja` | Preferred Japanese alternate name; null when GeoNames has none → show English |
| `search_en`, `search_ja` | `name_en` / `name_ja` through `lib/normalize.ts` (06). `search_ja` null when `name_ja` is |
| `region_en`, `region_ja` | First-level division (prefecture, state…), for the suggestion row only. Either may be null |
| `country_en`, `country_ja` | `country_ja` null → show English |
| `lat`, `lng` | |
| `population` | Ranks suggestions, biggest first |

Not a Payload collection, so it doesn't appear in the admin menu. The table itself is created by its own SQL migration. License: CC BY 4.0 — credit on the About page.

### Import — `scripts/import-geonames.ts`

Runs on Steffan's machine (Node), not in the Worker. Run once per environment; re-running replaces the data.

1. **Download** into a gitignored `geonames-cache/` (skipped if already there):
   - `cities1000.zip` — the places (~10MB)
   - `alternateNamesV2.zip` — names in every language (several hundred MB unzipped)
   - `countryInfo.txt` — country codes → country GeoNames ids
   - `admin1CodesASCII.txt` — region codes → region GeoNames ids
2. **Collect the ids** of every city, region and country in use.
3. **Stream** `alternateNamesV2.txt` line by line (never loaded whole). Keep only rows whose id is collected and whose language is `ja` or `en`, skipping historic, colloquial and short-name rows. Per id and language, prefer the row marked preferred, else the first.
4. **Build rows:** for each city, look up its own names, its region's names and its country's names; normalize the search columns.
5. **Write `build/cities.sql`** (gitignored): `DELETE FROM cities;`, then multi-row `INSERT`s of ~300 rows each (stays under D1's 100KB statement limit).
6. **Apply:** `wrangler d1 execute <db> --remote --file build/cities.sql`.

Print counts at the end (cities, with Japanese name, with region) as a sanity check. Expected: ~150k cities; most Japanese and major world cities have a Japanese name, small foreign towns often don't (they show in English).

## `users`

Payload auth collection with one account per person: Steffan and the artist (see 01).

## `revalidations` (plain D1 table, outside Payload)

OpenNext's tag cache: records when each cache tag was last cleared (08). Created and written by OpenNext, not by us. Lives in the same database, like `cities`; Payload's migrations never touch it. Don't edit by hand.

## R2 layout

One bucket:

| Prefix | Contents |
| --- | --- |
| `media/` | Artwork originals |
| `globe-photos/` | Visitor photo originals |
| `derived/{collection}/{id}/{size}.webp` | Every named size, made at upload (05). Rebuilt on demand if missing |
| `incremental-cache/` | OpenNext page/data cache (08). Safe to delete — pages re-render on next visit |

## Indexes

| Table | Index | For |
| --- | --- | --- |
| `artworks` | `(status, createdAt desc)` | All Works grid, quiz tag list |
| `globe_uploads` | `(status, createdAt desc)` | Pins, review queue, submissions table |
| `upload_attempts` | `(kind, keyHash, createdAt)` | Rate limits |
| `upload_attempts` | `createdAt` | Deleting rows older than 24 hours |
| `cities` | `search_en`, `search_ja` | City prefix search |

## Not stored

- About page text — in the i18n files (fixed content, edited in code).
- Quiz words, icons, feeling weight — config / i18n.
- Landing image — a static file in the code.
- Photo locations — never read; stored photos are metadata-free re-encodes (06).
