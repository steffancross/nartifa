# 01 Platform

## Accounts and environments — Decided

- **Build on Steffan's Cloudflare account.** One environment only (no separate preview/production).
- The artist uploads a few works there to try the admin.
- **Go-live is a fresh setup on the artist's account**, not a migration: new Worker, D1, R2, Turnstile keys and domain. Test content on Steffan's account is not carried over.
- Keep setup scripted (wrangler config, `seed-admin`, `import-geonames`, `build-globe-texture`) so the fresh setup is repeatable.

## Location — Decided

Most visitors and the artist are in Japan. D1 has one primary location, fixed when the database is created.

One D1 database and one R2 bucket in total (the page cache shares them — 08).

- Create the D1 database with `--location=apac`.
- Create the R2 bucket with location hint `apac`.
- Don't enable Smart Placement: with data in APAC, running the Worker next to the visitor is already right.
- Part of the setup script, so the go-live setup on the artist's account gets it too. It can't be changed after creation.

## Costs — Decided

| Item | Cost | Notes |
| --- | --- | --- |
| Workers Paid plan | $5 / month | Required: Payload + Next.js exceed the free plan's 3MB bundle limit. Paid limit is 10MB compressed — measured in Phase 0 (09). Includes generous Worker, D1 and R2 usage — this site stays well inside it |
| Domain | Yearly, depends on name | |
| Images binding (transformations) | $0 expected | First 5,000 unique transformations / month included, then $0.50 per 1,000. Only uploads transform — about 1,800 for 100 works, once (see 05) |
| Turnstile, Web Analytics | $0 | |

## Bindings and secrets

| Name | Type | Use |
| --- | --- | --- |
| `D1` | D1 binding | Payload database + `cities` table |
| `R2` | R2 binding | Image originals (artworks and globe photos) |
| `NEXT_INC_CACHE_R2_BUCKET` | R2 binding → same bucket as `R2` | OpenNext page/data cache, under `incremental-cache/` (08) |
| `NEXT_TAG_CACHE_D1` | D1 binding → same database as `D1` | OpenNext tag cache, `revalidations` table (08) |
| `WORKER_SELF_REFERENCE` | Service binding to this Worker | Required by OpenNext's R2 cache |
| `IMAGES` | Images binding | Makes the named sizes at upload (05) |
| `PAYLOAD_SECRET` | secret | Payload auth/session signing |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | secret | Read by `seed-admin` only |
| `TURNSTILE_SITE_KEY` | var | Public key for the upload form |
| `TURNSTILE_SECRET_KEY` | secret | Server-side token check |
| `IP_HASH_SALT` | secret | Salt for hashing IPs and visitor cookie ids in `upload_attempts` (06) |
| `INSTAGRAM_HANDLE` | var | Artist's handle for DM and profile links |

## Admin login — Decided

- Payload's built-in auth with a `users` collection holding **one shared account**.
- No roles, no change history, no email adapter.
- "Forgot password" is turned off.
- **Reset:** Steffan changes the password in the admin, or sets `ADMIN_PASSWORD` and runs `seed-admin`, which creates or updates the single user.
- Admin interface language: **switchable EN/JA** in the account settings. With one shared account the setting may follow the account. Default to Japanese after launch.

## Domain

- The site runs on a custom domain at go-live.
- The build runs on `workers.dev`. Nothing depends on a zone: images are made by the binding and served from R2 (05), and the page cache lives in R2/D1 (08).
- **Verify:** the Images binding works on `workers.dev` (bindings aren't tied to a zone, so expected yes). If not, attach a spare domain on Steffan's account for the build.

## Deploy

- Use the template's deploy flow: `payload migrate` for schema changes, then `opennextjs-cloudflare build` and `opennextjs-cloudflare deploy` (populates the page cache — see 08).
- Every schema change gets a Payload migration. No manual edits to D1.
- The `cities` table has its own SQL migration (it is outside Payload — see 02).
- `pnpm run deploy:database` runs `payload migrate` from your machine with `NODE_ENV=production`, which makes `payload.config.ts` connect to the **real** D1 (the binding has `"remote": true`). Migrations reach Cloudflare only this way.

## Local development

- `pnpm dev` runs Next.js in Node. `payload.config.ts` gets the bindings from wrangler's `getPlatformProxy` (Miniflare) with remote bindings **off**, so D1 and R2 are local stand-ins in `.wrangler/state/v3/` (gitignored):
  - D1: a real SQLite file under `d1/miniflare-D1DatabaseObject/`.
  - R2: uploaded files kept on disk under `r2/`, with a small SQLite index.
  - Nothing touches Cloudflare. Delete `.wrangler/state` to start from an empty database and bucket.
- In dev, Payload's **push** mode builds the local tables straight from the collection code (no migration files). Migrations are created with `payload migrate:create` when a feature is done and only run against the real D1. Don't run `payload migrate` against the pushed local database (Payload warns; data loss).
- `pnpm dev` does **not** exercise the Worker runtime or OpenNext's page cache. For those, use `pnpm preview` (builds with OpenNext and runs it in the local Workers runtime) or deploy to `workers.dev`.
- Local secret for dev: set `PAYLOAD_SECRET` in `.env` (gitignored; copy `.env.example`).
