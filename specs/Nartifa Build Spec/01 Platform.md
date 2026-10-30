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
| `TURNSTILE_SITE_KEY` | var | Public key for the upload form |
| `TURNSTILE_SECRET_KEY` | secret | Server-side token check |
| `IP_HASH_SALT` | secret | Salt for hashing IPs and visitor cookie ids in `upload_attempts` (06) |
| `INSTAGRAM_HANDLE` | var | Artist's handle for DM and profile links |

- The binding rows above are in `wrangler.jsonc` (2026-10-29). After changing bindings, run `pnpm generate:types:cloudflare` to refresh `cloudflare-env.d.ts`. If `.open-next/` exists (after a build), wrangler also adds a `GlobalProps` block importing `./.open-next/worker`; remove it (or delete `.open-next/` first), since that folder is gitignored and a fresh clone wouldn't type-check.
- All four D1/R2 bindings have `"remote": true` (R2 added 2026-10-29), so CLI commands run with `NODE_ENV=production` (`deploy:database`, `seed-admin:remote`, `next build`) reach the real database **and** bucket. `pnpm dev` ignores the flag and stays fully local.
- **`pnpm preview` is not used.** It would mix real and local data: OpenNext creates `revalidations` in the *local* database, then wrangler's dev server connects the bindings to the *real* database and bucket. With one environment, `workers.dev` is the test bed for anything Worker-specific.
- Workers logs are on via `"observability": { "enabled": true }` in `wrangler.jsonc` (08).
- `next build` also connects to the real D1: under the build, `payload.config.ts` sees `NODE_ENV=production` and asks wrangler for remote bindings. It only reads; nothing is pushed in production.

## Admin login — Decided

- Payload's built-in auth with a `users` collection holding **one account per person: Steffan and the artist** (changed 2026-10-29 from one shared account).
- No roles: every account can do everything (Payload's default access is "any logged-in user"). No change history, no email adapter.
- "Forgot password" is turned off. Without an email adapter Payload only logs "Email attempted without being configured" (address and subject); no reset link is sent or logged (checked in 3.92.1).
- **Create / reset:** in the admin (Users, or the account page), or with `scripts/seed-admin.ts`. It asks for an email and password (min. 12 characters; email stored lower-case), then creates that account, or resets its password and clears a lockout if it exists; it never touches other accounts. Nothing about the accounts is stored in env vars or uploaded to the Worker. `pnpm seed-admin` targets the local database, `pnpm seed-admin:remote` the real D1. Step-by-step: **docs/Admin Accounts.md**.
- Payload defaults kept: login lasts 2 hours; 5 wrong passwords lock the account for 10 minutes.

### Blocker: password hashing on Workers (found 2026-10-30)

**Login on the deployed Worker fails with "incorrect password" in Payload 3.90.0–3.92.1.** Payload 3.90 raised password hashing (PBKDF2-SHA256) from 25,000 to 600,000 iterations. Cloudflare's production runtime refuses PBKDF2 above 100,000 (`Pbkdf2 failed: iteration counts above 100000 are not supported`); Payload's password check catches that error and treats it as a wrong password, counting a failed attempt. The local Workers runtime doesn't enforce the cap, so every local test passes.

- Confirmed: the stored hash matched the typed password; PBKDF2 at 600,000 failed in a `wrangler dev --remote` test on Cloudflare; the same deployed build logged in fine in the local runtime.
- Upstream: [payloadcms/payload#18274](https://github.com/payloadcms/payload/issues/18274). Fixed by #19070 (main) and #19074 (3.x), merged 2026-10-29, **not in a release yet** (3.92.1 was published 2026-10-27).
- The fix adds `auth: { passwordHashIterations: 100000 }` to the root Payload config (allowed: `100000` or `600000`, default `600000`). Workers projects set `100000`.
- **Decision: wait for the release; no `pnpm patch`.** Then: upgrade all `@payloadcms/*`, set `auth.passwordHashIterations: 100000` in `payload.config.ts`, and reset every account with `seed-admin:remote` (a 100k environment can't verify existing 600k hashes). Also affects creating accounts and changing passwords in the live admin.
- Until then, work that doesn't need a live admin login carries on (Structure). `seed-admin` and `pnpm dev` are unaffected (Node).
- Admin interface language: **switchable EN/JA** in the account settings, per account. Default to Japanese after launch.

## Domain

- The site runs on a custom domain at go-live.
- The build runs on `workers.dev`. Nothing depends on a zone: images are made by the binding and served from R2 (05), and the page cache lives in R2/D1 (08).
- **Verify:** the Images binding works on `workers.dev` (bindings aren't tied to a zone, so expected yes). If not, attach a spare domain on Steffan's account for the build. **Checked 2026-10-30:** works on Steffan's account with no zone (all six sizes in a `wrangler dev --remote` test; see 05, Binding checked on Cloudflare).

## Deploy

- Use the template's deploy flow: `payload migrate` for schema changes, then `opennextjs-cloudflare build` and `opennextjs-cloudflare deploy` (populates the page cache — see 08).
- Every schema change gets a Payload migration. No manual edits to D1.
- The `cities` table has its own SQL migration (it is outside Payload — see 02).
- `pnpm run deploy:database` runs `payload migrate` from your machine with `NODE_ENV=production`, which makes `payload.config.ts` connect to the **real** D1 (the binding has `"remote": true`). Migrations reach Cloudflare only this way.
- **First deploy to a new account is done step by step**, not with `pnpm run deploy`: migrate → `seed-admin:remote` for each person → `deploy:app` → secrets. While `users` is empty, `/admin` shows Payload's "Create first user" form to anyone, so the accounts must exist before the app is live. Full order in docs/Admin Accounts.md.
- Secrets are set after the first `deploy:app` (the Worker must exist). Each value is `openssl rand -hex 32` (64 hex characters), used only there. Two ways:
  - **Dashboard:** Workers & Pages → `nartifa` → Settings → Variables and Secrets → Add, type **Secret** (not Text: plain-text variables added in the dashboard are deleted by the next deploy; secrets are kept). Generate the value in a terminal, paste it, save, then clear the terminal.
  - **CLI**, piped so the value is never shown or saved: `openssl rand -hex 32 | pnpm exec wrangler secret put PAYLOAD_SECRET`.
  - **OpenNext copies the local `.env` into the deployed Worker** (`.open-next/cloudflare/next-env.mjs`, from `.env`, `.env.{mode}`, `.env.local`, `.env.{mode}.local`). Found on the first deploy (2026-10-30): with no secrets set yet, the Worker ran on the local dev `PAYLOAD_SECRET`. Cloudflare secrets take precedence (OpenNext only fills names the Worker doesn't already have), so the dashboard secret replaces it. Rule: `.env` holds local-dev values only, never anything production needs to keep private.
  - `pnpm exec wrangler secret list` shows which are set (names only). Changing `PAYLOAD_SECRET` later logs everyone out; changing `IP_HASH_SALT` resets rate-limit counts.
- Bundle baseline (template + Payload + Lexical, 2026-10-29): **3.68 MB gzipped** (16.0 MB raw), limit 10 MB.

## Local development

- `pnpm dev` runs Next.js in Node. `payload.config.ts` gets the bindings from wrangler's `getPlatformProxy` (Miniflare) with remote bindings **off**, so D1 and R2 are local stand-ins in `.wrangler/state/v3/` (gitignored):
  - D1: a real SQLite file under `d1/miniflare-D1DatabaseObject/`.
  - R2: uploaded files kept on disk under `r2/`, with a small SQLite index.
  - Nothing touches Cloudflare. Delete `.wrangler/state` to start from an empty database and bucket.
- In dev, Payload's **push** mode builds the local tables straight from the collection code (no migration files). Migrations are created with `payload migrate:create` when a feature is done and only run against the real D1. Don't run `payload migrate` against the pushed local database (Payload warns; data loss).
- Push compares the whole local database with the collection code, and the D1 adapter (3.92) has no option to exclude tables. So it may offer to drop tables Payload doesn't own if they exist locally: `revalidations` (08), later `cities` and `upload_attempts` (02). Local copy only; answer no, or recreate them. The real D1 is never pushed.
- `pnpm dev` does **not** exercise the Worker runtime or OpenNext's page cache. For those, use `pnpm preview` (builds with OpenNext and runs it in the local Workers runtime) or deploy to `workers.dev`.
- Local secret for dev: set `PAYLOAD_SECRET` in `.env` (gitignored; copy `.env.example`).
