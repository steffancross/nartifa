# 02 Data Model

All Payload collections live in D1. Files live in R2.

**Text in two languages is a plain pair of fields — Decided (2026-10-30):** `titleJa` + `titleEn`, and so on. Payload's localization is **not used**: its form shows one language at a time behind a switcher, while the design (9c) has both side by side, and the site picks per field in its own code anyway (03). With pairs, Payload's stock form shows both at once, and hooks read both languages without a second lookup. Payload's `localization` config is removed, so there are no `_locales` tables.

## `artworks`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | number (auto) | **Used as the URL slug**: `/works/12`. Permanent: never changes, never reused — see Permanent links below |
| `live` | checkbox | The artist's switch, "Show on the site". Can only be on when nothing required is missing: the form greys it out, and the status hook turns it off on any save that leaves something missing (Status rule) |
| `status` | select, read-only | Computed on save: `live` / `hidden` / `incomplete` |
| `missing` | text list, read-only | Computed on save, e.g. `["smell", "feeling", "mainImage"]` |
| `sight` `smell` `taste` `touch` `hearing` | select: `a` / `b` | Words come from i18n (`quiz.sight.a` = "nature"…) |
| `feeling` | select: `joy` / `anger` / `sorrow` / `delight` | |
| `mainImage` | upload → `media` | Picking or dropping a file uploads it straight into the field (07) |
| `extraImages` | upload → `media`, many, ordered | Drag to reorder. Several files can be uploaded at once (07) |
| `titleJa`, `titleEn` | text | Either may be empty; a work can go live with one language |
| `description` `Ja` / `En` | textarea | Plain text; blank lines = paragraphs (Proposed) |
| `price` | number, whole | JPY. Empty = "Price on request" |
| `size` | text | One shared value, not per language |
| `materials` `Ja` / `En` | text | |
| `medium` `Ja` / `En` | text | |
| `year` | number | 4 digits |
| `series` | relationship → `series`, many | Labelled "Collections". Can create a new collection from the field |
| `displayTitle` | text, hidden, read-only | `titleJa`, else `titleEn`. The work's name everywhere in the admin (table, form header, pickers). Filled by the hook |
| `searchText` | text, hidden, read-only | Both titles, lower-cased, for admin search (07). Filled by the hook |
| `createdAt` / `updatedAt` | auto | `createdAt` = "date added", used for "newest first" |

### Status rule — Decided (easy to change)

Computed in a `beforeChange` hook, so it can be filtered and sorted:

```
required = [sight, smell, taste, touch, hearing, feeling, mainImage]
missing  = required fields that are empty
status   = missing nonEmpty → incomplete   (and live is turned off)
           !live            → hidden
           otherwise        → live
```

**Changed 2026-10-30 (hand test):** a work with anything missing is `incomplete` whether or not Live is on, and it can't be Live. Before, Live off always meant `hidden`, so a half-filled work never showed under the Incomplete filter, and Live could be ticked on an unfinished work.

- Only `status = live` works appear on the public site and in matching.
- The required list is one array in code (`src/config/artworks.ts`, `REQUIRED_FIELDS`); the rule is `computeStatus` in `src/lib/artwork-status.ts`. Changing what is required means editing that array and re-saving.
- The hook runs on the **whole** work (stored document + the change), so a save that only flips Live still sees every other field.
- **Live is turned off by the hook** whenever something is missing, whatever the save came from: the form, the ⋯ menu, the API, or a deleted main image. In the form the switch is already greyed out and turns itself off when a required field is emptied (07). Once the work is complete again, the artist turns Live back on herself.
- **Deleting an image is always allowed — Decided (2026-10-30).** A work that used it as its main image comes off the site: a `beforeDelete` hook on `media` notes which works use it, and an `afterDelete` hook re-saves each with no main image, so it becomes `incomplete` with `mainImage` missing and **Live turned off** (changed the same day after the hand test; it used to stay ticked). (The database empties the field by itself — `main_image_id … ON DELETE set null` — but that alone wouldn't recompute the stored status.) Extra images need nothing: the database drops a deleted image from the list, and they don't affect status. Code: `src/hooks/media.ts`.

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
| `works` | join → `artworks.series` | Not stored. "Works in this collection" on the collection's page (07) |

Not shown on the public site in v1 (the graphic is paused). Built now so the data is ready.

**Two required names, not one localized field — Decided (2026-10-30).** Both names must be given when a collection is added, including from the picker on a work. Payload's form shows one language at a time, so a localized `name` couldn't require both at once; two plain fields can. The public site will pick `nameJa` / `nameEn` by language. The admin shows collections by `nameJa` (`useAsTitle`); the list search covers both names.

**Slug — Decided (2026-10-30):** made from the English name by `slugify` (`src/lib/slug.ts`): lower-case, accents dropped, anything else that isn't a–z or 0–9 becomes `-` ("Night Garden (II)" → `night-garden-ii`); `collection` if nothing is left. A clash gets `-2`, `-3`…. It **follows the English name** on every save (`src/hooks/series.ts`), since nothing links to it yet. When the graphic ships and slugs appear in URLs, decide whether to freeze them like work ids.

**In the repo (2026-10-30):** `src/collections/Series.ts` and `src/collections/Artworks.ts`, migration `20261030_192738_collections` (both main tables `AUTOINCREMENT`; checked by `tests/int/artworks-ids.int.spec.ts`). `missing` is a Payload `text` field with `hasMany` (stored in `artworks_texts`). The six select fields store the keys from `src/config/quiz.ts`; their admin labels are read from `quiz.*` in `ja.json`/`en.json` (`src/i18n/admin-labels.ts`). The migration has been regenerated three times before reaching the real D1 (`…155951`, `…182139`, `…191428`): for the collection name pair, the artwork text pairs (with Payload localization removed), and `media.inUse`.

**Hooks in the repo (2026-10-30):** `src/hooks/artworks.ts` (status, missing, searchText), `src/hooks/media.ts` (main image delete), `src/hooks/series.ts` (slug). Unit tests for the pure functions; `tests/int/hooks.int.spec.ts` checks each hook against the local database.

## `media` (artwork images)

Payload upload collection, stored in R2 under `media/`.

| Field | Type | Notes |
| --- | --- | --- |
| `width`, `height` | number | Filled by Payload from the file header (no `sharp` needed — checked). Swapped by our hook for rotated phone photos (05) |
| `filename`, `mimeType`, `filesize` | auto | |

- Accepted: JPG, PNG, WebP. Max 20 MB (the Images binding's input limit). Both limits are `UPLOAD_LIMITS` in `src/config/images.ts`, checked in the browser before anything is sent and again on the server, with a clear message for each (05).
- No `sharp` resizing — sizes are made by the Images binding at upload and stored under `derived/` (05).
- No alt field — alt text is generated (05). (The template's required `alt` was dropped in migration `20261030_192738_collections`.)
- **Read access: logged-in admins only.** The template allowed anyone, which let `/api/media/file/<name>` serve full-resolution originals (05, Privacy). Public pages use Payload's local API, which skips access rules, so the site is unaffected.
- Stored under `media/` via the R2 plugin's `prefix` option, which adds a `prefix` column (default `'media'`).
- `inUse` (checkbox, read-only): whether any work uses the image as its main or an extra image. Kept up to date by the artwork hooks (`src/hooks/image-usage.ts`) on every save and delete, written straight to the database with the image's old `updatedAt`, so its `/img` version doesn't change. Behind the **Unused** filter on the Images list (07).
- `usedAsMain`, `usedAsExtra`: Payload join fields (virtual, nothing stored) listing the works that use the image, shown on the image's page. Not used for the filter: Payload's filter panel can't show a filter on a join field and throws.
- `inUse`, `usedAsMain` and `usedAsExtra` are hidden on a new image's page until it's saved (they'd be empty). A new image saves itself as soon as its file is chosen (07).
- `bulkUpload: false`: one image at a time, always (decided 2026-10-30).

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
