# 07 Admin

Design spec 09 and 10. Built on Payload's admin; custom only where the stock admin doesn't fit.

## General — Decided

- `/admin` opens on the **artworks table** (redirect from Payload's dashboard).
- Nav: Artworks · Review queue (with pending count) · Submissions · Collections · **Images**, under one "NARTIFA" heading (Payload's default heading is "Collections", which reads as the artist's collections). `globe-photos` and `users` (labelled Accounts) are hidden with `admin.group: false`, which keeps their pages working. **Images stays in the menu — Decided 2026-10-30:** it's the one place to delete images no work uses, with an **Unused** filter.
- Admin colors from design spec Tokens (admin section), applied through Payload's admin CSS. **For now the admin is Payload's dark theme** (`admin.theme: 'dark'`, decided 2026-10-30); the light admin colors are applied later.
- Every field label written in EN and JA. Payload's own interface text is available in Japanese; language switchable in account settings.
- Delete confirmation text overridden to say the item **cannot be recovered**: Payload's `general:aboutToDelete` / `aboutToDeleteCount_*` through `i18n.translations`, text in `ja.json` / `en.json` (`admin.delete.*`). Applies to every collection.
- The toast after a refused save says **"Please fill in or fix: Name (Japanese)"** / 「入力または修正してください：…」 instead of Payload's "The following field is invalid:" (`error:followingFieldsInvalid_*`, `admin.errors.fieldsInvalid`). Changed 2026-10-30 after the hand test.
- **An item's page is just its form — Decided 2026-10-30 (hand test).** On artworks, collections and images: no Edit / API tabs (`hideAPIURL`, and the Edit tab's `condition` returns false: a tab bar of one), no Duplicate (`disableDuplicate`), and no ⋮ menu (hidden in `custom.scss`; Payload has no setting for its "Create new" item). **Delete** is its own button after Save (`beforeDocumentControls`, `src/admin/DeleteButton.tsx`, red outline): asks with the same "can't be recovered" text as the table, then goes back to the list. Shared setup in `src/config/admin.ts` (`ITEM_PAGE_COMPONENTS`). The ⋮ menu is hidden on the (hidden) Accounts pages too.
- **Adding an image is just choosing the file — Decided 2026-10-30 (hand test).** Payload always adds an image through the image's own form (in a drawer, or its bulk upload with a Save button), showing empty "In use" / "used by" fields first; there's no setting to skip it (checked in the docs and GitHub). So:
  - **On a work:** the main image and extra images fields (`src/admin/artworks/ImageField.tsx`) have our own **Upload image(s)** button inside Payload's box ("Upload image or Choose from existing", "or drag files here") and take dropped files anywhere on the field. Files upload straight to `/api/media` and land in the field; extra images take several at once. Payload's own "Create new" and drop are off (`allowCreate: false`). The button is placed into Payload's markup by its class names (`.upload__dropzoneContent__buttons`), so a Payload upgrade that renames them would hide it: the e2e test checks it.
  - **Images → Create new:** the page shows only the file picker (In use and the "used by" lists appear once saved) and saves as soon as a file is chosen, then opens the saved image (`src/admin/media/FileCheck.tsx`; each file is sent once).
  - **No Bulk upload** (`upload.bulkUpload: false`).
  - Files that can't be uploaded are stopped when picked or dropped, with a message (05, upload checks).

## Stock vs custom

| Screen / feature | Stock Payload | Custom |
| --- | --- | --- |
| 9a Login | Login screen; forgot-password off — Payload 3.92 always renders the link, so `custom.scss` hides it (`.login__form a[href$='/forgot']`); there's no email service, so the page behind it can't send anything anyway | — |
| 9b Artworks table | List view, search, column picker, New button, delete confirm | Quick filter row; custom cells; `searchText` field so search covers both titles |
| Row ⋯ menu | Bulk select + actions | Small custom cell (Edit · Hide/Show · Delete) |
| 9c/9d Form | All fields, relationship "create new", drag reorder, unsaved-changes warning, Saving/Saved messages | Status hook; "Show on the site" switch with the status note; direct image upload; Delete button |
| 10a Review queue | — | **Custom admin view** |
| 10b Submissions table | List, search, column picker | Quick filter row; Rejected hidden by default; Restore |
| 10c Edit upload | Edit view, status, comment, delete | City picker field; coordinates read-only |

## Artworks table (9b)

**Quick filter row** above the table: All / Live / Hidden / Incomplete — buttons, not Payload's query builder (`beforeListTable`; they set the list's `where`, so the URL keeps the filter).

**Columns** (custom cells):

| Column | Cell |
| --- | --- |
| Thumbnail | `thumb` of `mainImage`, shown at 40×40 |
| Title | JA, else EN |
| Price | "¥22,000" / "On request" |
| Status | Live / Hidden / Incomplete, in the status colors. What's missing shows only on the work's page (changed 2026-10-30, hand test) |
| Updated | Relative ("3 days ago") |
| ⋯ | Edit · Hide/Show · Delete. Show is greyed out on an incomplete work, which can't go live |

**Search: title in both languages.** Payload's search box looks in one field. So:
- `searchText`: a hidden, read-only text field on `artworks`. The `beforeChange` hook fills it with `titleJa` and `titleEn`, lower-cased (`src/hooks/artworks.ts`, `src/lib/search-text.ts`).
- `admin.listSearchableFields: ['searchText']`. The stock search box then finds a work by either title.
- (Before the text pairs, titles were Payload-localized and the hook had to look up the other language. Lesson kept for any future localized field: a local API call with a `locale` passed the save's `req` overwrites `req.locale`.)

Empty state: Payload's stock "No Artworks found" + Create new — close enough to the design, kept.

**In the repo (2026-10-30):** components in `src/admin/` (`DashboardRedirect`, `DeleteButton`, `UploadGuard`, `artworks/StatusFilter`, `ThumbnailCell`, `TitleCell`, `PriceCell`, `StatusCell`, `UpdatedCell`, `ActionsCell`, `LiveSwitch`, `StatusNote`, `ImageField`, `media/UnusedFilter`, `media/FileCheck`), pure text helpers in `src/lib/admin-format.ts`, styles in `src/app/(payload)/custom.scss` (status colors from the design's admin tokens). Notes:
- The list loads works at depth 0, so the thumbnail cell builds `/img/media/{id}/thumb` from the id, with the **work's** `updatedAt` as `?v=`. A replaced image file shows its old thumbnail in that browser until the work is saved again. Admin only.
- The Updated column is Payload's own `updatedAt`, declared on the collection only to give it the relative-date cell (no schema change).
- ⋯ Hide/Show and Delete call the REST API (`PATCH live`, `DELETE`) and refresh the table; delete asks with Payload's confirmation modal.
- Any column picked in the column picker still works; the ⋯ column is a `ui` field (no data).
- **Images → Unused** filters on `media.inUse` (02). A filter value of boolean `false` is dropped when Payload writes the filter into the URL, so the button sends `'false'` as text.
- e2e: `tests/e2e/admin.e2e.spec.ts`, including a check that no admin page throws an uncaught error.

## Artwork form (9c / 9d) — stock layout, built 2026-10-30

Payload's layout (main column + sidebar), with Payload's layout fields (rows, widths, collapsible sections — layout only, no data):

- **Sidebar:** Live switch · status note · Collections.
  - **Live** is a switch labelled **"Show on the site / サイトに表示"** (`src/admin/artworks/LiveSwitch.tsx`). It's greyed out while anything required is missing, and turns itself off if a required field is emptied on a live work (02, Status rule; changed 2026-10-30 after the hand test, when Live could be ticked on an unfinished work).
  - The note under it is the `status` field's custom form component, worked out **live from the form** with the same rule as the save (`computeStatus`): "On the site" / "Not on the site" / "Can't be shown yet. Needs: Smell, Main image".
- **Main column, in sections:**
  1. Images — main image, extra images (drag to reorder). Uploading goes straight into the field (General, above)
  2. Matching — six selects in two rows of three (labels and option words from i18n, same as the quiz)
  3. Content — Title JA · Title EN, Description JA · EN (side by side, 02 text pairs), then Price · Size · Year in one row, Materials JA · EN, Medium JA · EN

Judge it by hand. If it doesn't look good, switch to a custom edit view matching 9c — UI only; data and hooks stay the same.

Validation (design spec 09): price whole yen, 0 or more; year 4 digits (`src/lib/validation.ts`, messages in the admin's language); save always allowed — missing tags or image only make the work incomplete (and Live off).

**Collections page:** "Works in this collection" lists the works in it (`series.works`, a join field, 02).

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
