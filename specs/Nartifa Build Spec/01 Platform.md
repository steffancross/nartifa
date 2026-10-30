# 01 Platform

## Accounts and environments — Decided

- **Build on Steffan's Cloudflare account.** One environment only (no separate preview/production).
- The artist uploads a few works there to try the admin.
- **Go-live is a fresh setup on the artist's account**, not a migration: new Worker, D1, R2, Turnstile keys and domain. Test content on Steffan's account is not carried over.
- Keep setup scripted (wrangler config, `setup-cloudflare`, `seed-admin`, `import-geonames`, `build-globe-texture`) so the fresh setup is repeatable.

## Location — Decided

Most visitors and the artist are in Japan. D1 has one primary location, fixed when the database is created.

One D1 database and one R2 bucket in total (the page cache shares them — 08).

- Create the D1 database with `--location=apac`.
- Create the R2 bucket with location hint `apac`.
- Don't enable Smart Placement: with data in APAC, running the Worker next to the visitor is already right.
- Part of the setup script, so the go-live setup on the artist's account gets it too. It can't be changed after creation.

### Setup script — `scripts/setup-cloudflare.sh`

```
CLOUDFLARE_ACCOUNT_ID=<id> scripts/setup-cloudflare.sh
```

- Creates the D1 database and R2 bucket `nartifa` with `--location=apac`. No jurisdiction (it would override the location), default storage class.
- Shows the account name and asks for `yes` before creating anything. Anything that already exists is left alone, so it is safe to re-run.
- Afterwards it checks both report `APAC` and prints the `database_id` to put in `wrangler.jsonc`, filled by hand.
- Both create commands pass `--update-config=false`. Without it wrangler asks to add its own binding for the new resource, named after the resource. It added a second `nartifa` binding next to `D1`/`R2`, failed on the bucket (binding names must be unique) and re-indented the whole file.
- **Resource name vs binding name:** `database_name` / `bucket_name` is the resource's name on the account (unique per type, so the D1 and the bucket can both be `nartifa`). `binding` is the name the code uses (`env.D1`, `env.R2`) and must be unique within the Worker. Several bindings may point at one resource, which is how the page cache shares the database and bucket (08).
- It doesn't create the Worker. The first `pnpm run deploy` creates the `nartifa` Worker from `name` in `wrangler.jsonc`.
- **Account selection:** the wrangler login is per computer, not per repo, and can reach more than one account. `account_id` in `wrangler.jsonc` pins most commands, but `wrangler r2 …` ignores it and stops with "More than one account available". So set `CLOUDFLARE_ACCOUNT_ID` for every wrangler command run by hand. The script refuses to run unless it is set and matches `account_id` in `wrangler.jsonc`.
- **Go-live:** change `account_id` in `wrangler.jsonc` to the artist's account, run the script with their id, then fill the new `database_id`.
- **Steffan's account (created 2026-10-29):** D1 `nartifa` `b25a6db9-b6b4-4886-9aaf-f8f17c5b194b`, region APAC. R2 `nartifa`, location APAC, Standard.

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
| ~~`WORKER_SELF_REFERENCE`~~ | Service binding to this Worker | **Not used.** Checked in OpenNext 1.20.13: the R2 cache doesn't need it; only OpenNext's queues (time-based revalidation) and Pages Router `res.revalidate` do, and this site uses neither (08). Left commented out in `wrangler.jsonc` |
| `IMAGES` | Images binding | Makes the named sizes at upload (05) |
| `ASSETS` | Static assets | From the template; serves `.open-next/assets` |
| `PAYLOAD_SECRET` | secret | Payload auth/session signing |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | secret | Read by `seed-admin` only |
| `TURNSTILE_SITE_KEY` | var | Public key for the upload form |
| `TURNSTILE_SECRET_KEY` | secret | Server-side token check |
| `IP_HASH_SALT` | secret | Salt for hashing IPs and visitor cookie ids in `upload_attempts` (06) |
| `INSTAGRAM_HANDLE` | var | Artist's handle for DM and profile links |

- The binding rows above are in `wrangler.jsonc` (2026-10-29). After changing bindings, run `pnpm generate:types:cloudflare` to refresh `cloudflare-env.d.ts`.
- `D1` and `NEXT_TAG_CACHE_D1` both have `"remote": true` (so `deploy:database` and `pnpm preview` reach the real database); `R2` and `NEXT_INC_CACHE_R2_BUCKET` don't. Settle this before relying on `pnpm preview`: as is, preview would read the real database but a local bucket.
- `next build` also connects to the real D1: under the build, `payload.config.ts` sees `NODE_ENV=production` and asks wrangler for remote bindings. It only reads; nothing is pushed in production.

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
- Push compares the whole local database with the collection code, and the D1 adapter (3.92) has no option to exclude tables. So it may offer to drop tables Payload doesn't own if they exist locally: `revalidations` (08), later `cities` and `upload_attempts` (02). Local copy only; answer no, or recreate them. The real D1 is never pushed.
- `pnpm dev` does **not** exercise the Worker runtime or OpenNext's page cache. For those, use `pnpm preview` (builds with OpenNext and runs it in the local Workers runtime) or deploy to `workers.dev`.
- Local secret for dev: set `PAYLOAD_SECRET` in `.env` (gitignored; copy `.env.example`).
