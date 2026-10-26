# 02 Data Model

All Payload collections live in D1. Files live in R2. Fields marked **loc** are Payload localized fields with `ja` (default) and `en` values.

Payload localization: locales `ja`, `en`; default `ja`; fallback on (see 03 for how fallback is detected per field).

## `artworks`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | number (auto) | **Used as the URL slug**: `/works/12`. Numbers must never be reused — see Verify below |
| `live` | checkbox | The artist's toggle — what they *want* |
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
| `collections` | relationship → `collections`, many | Can create a new collection from the field |
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
- The required list is one array in code. Changing what is required means editing that array and re-saving.
- Deleting a `media` file that is used as a `mainImage` is **blocked** with a message, so a status can never go stale.

**Verify — slugs never reused.** SQLite can reuse the highest id after the last row is deleted unless the table uses `AUTOINCREMENT`. Check what Payload's D1 adapter generates. If ids can be reused, add a separate `number` field filled from a counter and use that as the slug.

## `collections`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | text, **loc** | |
| `slug` | text, unique | Auto from the name; for the future collection graphic |

Not shown on the public site in v1 (the graphic is paused). Built now so the data is ready.

## `media` (artwork images)

Payload upload collection, stored in R2.

| Field | Type | Notes |
| --- | --- | --- |
| `width`, `height` | number | **Verify** Payload fills these without `sharp`. If not, read them on upload with a small header-parsing library |
| `filename`, `mimeType`, `filesize` | auto | |

- Accepted: JPG, PNG, WebP. Max 20MB (Proposed).
- No `sharp` resizing — sizes come from Image Transformations (05).
- No alt field — alt text is generated (05).

## `globe-photos`

Separate upload collection for visitor photos, so they never mix with artworks. Same fields as `media`. Stored in R2 under its own prefix.

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
| `ipHash` | text | Salted SHA-256 of the visitor IP. For rate limits only, never shown |
| `createdAt` | auto | "Sent" time |

The city name and coordinates are copied onto the upload so pins and tables need no lookup.

## `cities` (plain D1 table, outside Payload)

Loaded once by `scripts/import-geonames.ts` from GeoNames **cities1000** (places over 1,000 people, about 140k rows) plus country info and Japanese alternate names.

| Column | Notes |
| --- | --- |
| `id` | GeoNames id |
| `name_en`, `name_ja` | `name_ja` null when GeoNames has none → show English |
| `search_en`, `search_ja` | Lower-cased / normalized names for prefix search |
| `country_en`, `country_ja` | |
| `lat`, `lng` | |
| `population` | Ranks suggestions, biggest first |

Not a Payload collection, so it doesn't appear in the admin menu. Has its own SQL migration. License: CC BY 4.0 — credit on the About page.

## `users`

Payload auth collection with one account (see 01).

## Indexes

| Table | Index | For |
| --- | --- | --- |
| `artworks` | `(status, createdAt desc)` | All Works grid, quiz tag list |
| `globe_uploads` | `(status, createdAt desc)` | Pins, review queue, submissions table |
| `globe_uploads` | `(ipHash, createdAt)` | Rate limits |
| `cities` | `search_en`, `search_ja` | City prefix search |
| `cities` | `(lat, lng)` | Nearest-city lookup |

## Not stored

- About page text — in the i18n files (fixed content, edited in code).
- Quiz words, icons, feeling weight — config / i18n.
- Landing image — a static file in the code.
- Exact photo locations — never leave the visitor's browser.
