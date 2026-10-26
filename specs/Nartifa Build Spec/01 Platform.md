# 01 Platform

## Accounts and environments — Decided

- **Build on Steffan's Cloudflare account.** One environment only (no separate preview/production).
- The artist uploads a few works there to try the admin.
- **Go-live is a fresh setup on the artist's account**, not a migration: new Worker, D1, R2, Turnstile keys and domain. Test content on Steffan's account is not carried over.
- Keep setup scripted (wrangler config, `seed-admin`, `import-geonames`, `build-globe-texture`) so the fresh setup is repeatable.

## Costs — Decided

| Item | Cost | Notes |
| --- | --- | --- |
| Workers Paid plan | $5 / month | Required: Payload + Next.js exceed the free plan's 3MB bundle limit. Includes generous Worker, D1 and R2 usage — this site stays well inside it |
| Domain | Yearly, depends on name | |
| Image Transformations | $0 expected | First 5,000 unique transformations / month free, then $0.50 per 1,000. Expected use is a few thousand (see 05) |
| Turnstile, Web Analytics | $0 | |

## Bindings and secrets

| Name | Type | Use |
| --- | --- | --- |
| `D1` | D1 binding | Payload database + `cities` table |
| `R2` | R2 binding | Image originals (artworks and globe photos) |
| `IMAGES` | Images binding (if used — see 05) | Transformations from the image route |
| `PAYLOAD_SECRET` | secret | Payload auth/session signing |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | secret | Read by `seed-admin` only |
| `TURNSTILE_SITE_KEY` | var | Public key for the upload form |
| `TURNSTILE_SECRET_KEY` | secret | Server-side token check |
| `IP_HASH_SALT` | secret | Salt for hashing visitor IPs (rate limits) |
| `INSTAGRAM_HANDLE` | var | Artist's handle for DM and profile links |

## Admin login — Decided

- Payload's built-in auth with a `users` collection holding **one shared account**.
- No roles, no change history, no email adapter.
- "Forgot password" is turned off.
- **Reset:** Steffan changes the password in the admin, or sets `ADMIN_PASSWORD` and runs `seed-admin`, which creates or updates the single user.
- Admin interface language: **switchable EN/JA** in the account settings. With one shared account the setting may follow the account. Default to Japanese after launch.

## Domain

- The site runs on a custom domain at go-live.
- **Verify:** Image Transformations need a Cloudflare zone. During the build on Steffan's account, use a spare domain/subdomain on that account, or confirm the Images binding works on `workers.dev`.

## Deploy

- Use the template's deploy flow: wrangler, `payload migrate` for schema changes, then build and deploy.
- Every schema change gets a Payload migration. No manual edits to D1.
- The `cities` table has its own SQL migration (it is outside Payload — see 02).
