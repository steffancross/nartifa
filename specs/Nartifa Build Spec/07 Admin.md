# 07 Admin

Design spec 09 and 10. Built on Payload's admin; custom only where the stock admin doesn't fit.

## General — Decided

- `/admin` opens on the **artworks table** (redirect from Payload's dashboard).
- Nav: Artworks · Review queue (with pending count) · Submissions · Collections. Hide `media`, `globe-photos` and `users` from the nav where possible.
- Admin colors from design spec Tokens (admin section), applied through Payload's admin CSS.
- Every field label written in EN and JA. Payload's own interface text is available in Japanese; language switchable in account settings.
- Delete confirmation text overridden to say the item **cannot be recovered**.

## Stock vs custom

| Screen / feature | Stock Payload | Custom |
| --- | --- | --- |
| 9a Login | Login screen; forgot-password off | — |
| 9b Artworks table | List view, search, column picker, New button, delete confirm | Quick filter row; custom cells; `searchText` field so search covers both titles |
| Row ⋯ menu | Bulk select + actions | Small custom cell (Edit · Hide/Show · Delete) |
| 9c/9d Form | All fields, relationship "create new", drag reorder, unsaved-changes warning, Saving/Saved messages | Status hook; "Not live — missing: …" note |
| 10a Review queue | — | **Custom admin view** |
| 10b Submissions table | List, search, column picker | Quick filter row; Rejected hidden by default; Restore |
| 10c Edit upload | Edit view, status, comment, delete | City picker field; coordinates read-only |

## Artworks table (9b)

**Quick filter row** above the table: All / Live / Hidden / Incomplete — buttons, not Payload's query builder.

**Columns** (custom cells):

| Column | Cell |
| --- | --- |
| Thumbnail | `thumb` of `mainImage`, shown at 40×40 |
| Title | JA, else EN |
| Price | "¥22,000" / "On request" |
| Status | Live / Hidden / **Incomplete: needs Smell, Feeling** (from `missing`), in the status colors |
| Updated | Relative ("3 days ago") |
| ⋯ | Edit · Hide/Show · Delete |

**Search: title in both languages.** Payload's list search only looks at the admin's current language for localized fields. So:
- `searchText`: a hidden, read-only, **non-localized** text field on `artworks`. The `beforeChange` hook fills it with the Japanese and English titles, lower-cased: it reads the other language's title with `findByID({ locale: 'all' })` and merges the one being saved.
- `admin.listSearchableFields: ['searchText']`. The stock search box then finds a work by either title, whatever language the admin is in.

Empty state: "No artworks yet" + New artwork.

## Artwork form (9c / 9d) — Proposed: stock layout first

Payload's layout (main column + sidebar), styled with Payload's layout fields (rows, widths, collapsible sections) and the admin stylesheet:

- **Sidebar:** Live toggle · status note ("Not live — missing: Smell, Feeling") · Collections.
- **Main column, in sections:**
  1. Images — main image, extra images (drag to reorder)
  2. Matching — six selects (labels and option words from i18n, same as the quiz)
  3. Content — Title EN/JA, Description EN/JA, Price, Size, Materials EN/JA, Medium EN/JA, Year

Build this form early and judge it with real fields. If it doesn't look good, switch to a custom edit view matching 9c. That is a UI-only change; data and hooks stay the same.

Validation (design spec 09): price whole number; year 4 digits; save always allowed — missing tags or image only change status.

## Review queue (10a) — custom view, Decided

- **Desktop first**; rows stack below 768px so it works on a phone.
- Shows `pending` uploads, **newest first**.
- Header: "Waiting for review" + badge = **count of all pending** · link to Submissions.
- Row: photo (`thumb`, shown 150×110), place (current admin language), time sent, comment or "(no comment)", **Approve** and **Reject**.
- **New dot:** shown while `seenAt` is empty. A row counts as seen after it has been on screen ~1 second; mark seen rows in batches.
- **Approve** → `status = live`. **Reject** → `status = rejected`. Both **save immediately**; the row leaves the queue.
- **Undo** (5 seconds): reverts the status. Closing the tab never loses a decision.
- Action failed → row stays with an error line.
- Click photo → larger view (`lg`).
- Empty: "Nothing to review."

## Submissions table (10b)

- Quick filters: All / Pending / Live / Hidden / Rejected. **"All" excludes Rejected**; Rejected shows only when chosen.
- From Rejected: **Restore** (→ pending) or delete permanently.
- Columns: thumbnail (30×30), place, comment (one line), status, sent date, ⋯ (Edit · Hide/Show · Delete).
- Search: place or comment — `admin.listSearchableFields: ['cityNameEn', 'cityNameJa', 'comment']`. These fields aren't localized, so stock search covers both languages with no extra field.

## Edit upload (10c)

- Stock edit view: photo with "sent 2 hours ago", status select, comment.
- **City picker:** custom field using `/api/site/cities`; saving updates `cityId`, names and coordinates together.
- Coordinates: read-only (they come from the city).
- Delete, with confirmation.
