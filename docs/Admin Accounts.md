# Admin Accounts

How to create admin accounts, reset passwords and remove accounts for the NARTIFA admin (`/admin`).
Written for both setups: the build on Steffan's Cloudflare account now, and the fresh setup on the artist's account at go-live. Background is in *Build Spec 01, Admin login*.

## How accounts work

- **One account per person:** one for Steffan, one for the artist. More can be added the same way.
- **Every account can do everything.** Payload has no roles here: anyone who can log in can create, edit and delete works, collections, globe uploads and other accounts.
- **No email is ever sent.** The site has no email service, so "forgot password" can't email a link. Passwords are reset as described below.
- **Logins last 2 hours.** After that the admin asks you to log in again.
- **5 wrong passwords lock the account for 10 minutes.** It unlocks by itself, or immediately with a reset (below).
- **Each account has its own admin language** (English / 日本語), set on the account page.

## Before you start (every time)

Run these from the repo folder, with Node 24 (`nvm use`) and wrangler logged in (`pnpm exec wrangler whoami`).

The wrangler login can reach more than one Cloudflare account, so always say which one:

```bash
export CLOUDFLARE_ACCOUNT_ID=685bd7f1b321e359e1dd1cd02913d680
```

That id is Steffan's account. At go-live, use the artist's account id; it must match `account_id` in `wrangler.jsonc`.

### Typing the password safely

`seed-admin` reads the email and password from environment variables. Typing the password into a command leaves it in your shell history, so read it without echoing instead (zsh):

```bash
export ADMIN_EMAIL=someone@example.com
read -rs "ADMIN_PASSWORD?Password: "; export ADMIN_PASSWORD; echo
```

Passwords must be at least 12 characters. When you're done:

```bash
unset ADMIN_EMAIL ADMIN_PASSWORD
```

## Create an account

**From the admin (when someone can already log in):** Users → Create New, enter the email and a password, save. Then send the person their password in a private message, and ask them to change it on their account page.

**From the command line (the first accounts, or when nobody can log in):**

```bash
pnpm seed-admin:remote
```

With `ADMIN_EMAIL` and `ADMIN_PASSWORD` set as above, this creates the account in the real database. Run it once per person.

`pnpm seed-admin` (without `:remote`) does the same in the local development database (`pnpm dev`).

## Reset a password

| Situation | What to do |
| --- | --- |
| You can log in and want a new password | Open your account (account icon in the admin, or `/admin/account`) → Change Password → save |
| Someone forgot their password, and someone else can log in | The other person opens Users → that account → sets a new password → saves, then sends it privately |
| Nobody can log in, or the account is locked | Set `ADMIN_EMAIL` to that account's email and a new `ADMIN_PASSWORD`, then run `pnpm seed-admin:remote` |

`seed-admin` resets the password when the email already exists, and also clears a lockout from wrong passwords. It never creates a second account for the same email, and never touches other accounts.

The login page may still show a "Forgot password?" link until the admin tweaks are done (Phase 1). It does nothing useful: no email is sent and no reset link exists anywhere.

## Remove an account

Log in with another account, open Users → the account → Delete. Keep at least one account. If the last one is deleted, run `seed-admin:remote` to create one again.

## First setup on a new Cloudflare account (build, and again at go-live)

The order matters. While the database has **no accounts**, Payload's `/admin` shows a "Create first user" form to anyone who opens it. So the accounts must exist **before the app is deployed**:

1. `scripts/setup-cloudflare.sh`: creates the D1 database and R2 bucket (see *Build Spec 01, Setup script*). Fill the new `database_id` into `wrangler.jsonc`.
2. `pnpm run deploy:database`: creates Payload's tables in the new database.
3. `pnpm seed-admin:remote`: once for Steffan, once for the artist.
4. `pnpm run deploy:app`: builds and deploys the site. (Plain `pnpm run deploy` runs steps 2 and 4 together, which is fine for every deploy after the first.)
5. Set the Worker's secrets `PAYLOAD_SECRET` and `IP_HASH_SALT`, each a fresh `openssl rand -hex 32` value. In the dashboard: Workers & Pages → `nartifa` → Settings → Variables and Secrets → Add, type **Secret** (a Text variable would be wiped by the next deploy). Or by CLI: `openssl rand -hex 32 | pnpm exec wrangler secret put PAYLOAD_SECRET`. Until `PAYLOAD_SECRET` is set, the admin doesn't work. Details: *Build Spec 01, Deploy*.
6. Open `/admin` on the new address and log in with both accounts.

Status: steps 2–6 have not been run yet on Steffan's account (first deploy is the next chunk of Phase 0). Update this section if anything differs when they are.
