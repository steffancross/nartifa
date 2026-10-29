#!/usr/bin/env bash
# Creates NARTIFA's D1 database and R2 bucket in Asia Pacific (Build Spec 01, Location).
# Run once per Cloudflare account: Steffan's for the build, the artist's at go-live.
# The location can't be changed after creation, so this never guesses the account.
#
#   CLOUDFLARE_ACCOUNT_ID=<id> scripts/setup-cloudflare.sh
#
# Safe to re-run: anything that already exists is left alone and only checked.
# The Worker itself is not created here; the first `pnpm run deploy` creates it.
set -euo pipefail

cd "$(dirname "$0")/.."

NAME=nartifa # D1 database and R2 bucket name, as in wrangler.jsonc
LOCATION=apac
EXPECTED_REGION=APAC # how Cloudflare reports the apac location back

wrangler() { pnpm exec wrangler "$@"; }
json_field() { node -e 'const d = JSON.parse(require("fs").readFileSync(0, "utf8")); console.log(d[process.argv[1]] ?? "")' "$1"; }

# wrangler's r2 commands ignore account_id in wrangler.jsonc and stop when the login reaches
# more than one account, so the account always comes from the environment
if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "Set CLOUDFLARE_ACCOUNT_ID first." >&2
  exit 1
fi

# wrangler.jsonc must name the same account, so later deploys land next to these resources
config_account=$(grep -oE '"account_id": *"[0-9a-f]{32}"' wrangler.jsonc | grep -oE '[0-9a-f]{32}' || true)
if [[ "$config_account" != "$CLOUDFLARE_ACCOUNT_ID" ]]; then
  echo "CLOUDFLARE_ACCOUNT_ID ($CLOUDFLARE_ACCOUNT_ID) doesn't match account_id in wrangler.jsonc (${config_account:-none})." >&2
  echo "Change account_id in wrangler.jsonc first if this is a new account." >&2
  exit 1
fi

account_name=$(wrangler whoami 2>/dev/null | grep "$CLOUDFLARE_ACCOUNT_ID" | awk -F'│' '{gsub(/^ +| +$/, "", $2); print $2}' || true)
if [[ -z "$account_name" ]]; then
  echo "The wrangler login can't reach account $CLOUDFLARE_ACCOUNT_ID. Run: pnpm exec wrangler login" >&2
  exit 1
fi

echo "Account:  $account_name ($CLOUDFLARE_ACCOUNT_ID)"
echo "Creates:  D1 database '$NAME' and R2 bucket '$NAME', location $LOCATION (permanent)"
read -r -p "Type yes to continue: " answer
if [[ "$answer" != yes ]]; then
  echo "Stopped. Nothing was created."
  exit 1
fi

echo
if wrangler d1 info "$NAME" --json >/dev/null 2>&1; then
  echo "D1 '$NAME' already exists, not creating it."
else
  # --update-config=false: otherwise wrangler offers to add its own binding and rewrites wrangler.jsonc
  wrangler d1 create "$NAME" --location="$LOCATION" --update-config=false
fi

echo
if wrangler r2 bucket info "$NAME" --json >/dev/null 2>&1; then
  echo "R2 bucket '$NAME' already exists, not creating it."
else
  wrangler r2 bucket create "$NAME" --location="$LOCATION" --update-config=false
fi

d1_info=$(wrangler d1 info "$NAME" --json)
r2_info=$(wrangler r2 bucket info "$NAME" --json)
database_id=$(json_field uuid <<<"$d1_info")
d1_region=$(json_field running_in_region <<<"$d1_info")
r2_region=$(json_field location <<<"$r2_info")

echo
echo "D1 '$NAME':  region $d1_region, id $database_id"
echo "R2 '$NAME':  location $r2_region"

status=0
if [[ "$d1_region" != "$EXPECTED_REGION" || "$r2_region" != "$EXPECTED_REGION" ]]; then
  echo "WARNING: expected $EXPECTED_REGION for both. The location can't be changed; delete and recreate while they are still empty." >&2
  status=1
fi

echo
if grep -q "\"database_id\": \"$database_id\"" wrangler.jsonc; then
  echo "wrangler.jsonc already has this database_id."
else
  echo "Next: set the D1 entry in wrangler.jsonc to"
  echo "  \"database_id\": \"$database_id\""
fi
exit $status
