#!/usr/bin/env bash
# Stores the Account 2 R2 READ credentials as secrets on the Worker (Account 1).
# Values are typed into Wrangler's hidden prompt: they are never echoed, logged, or written to files.
set -euo pipefail
cd "$(dirname "$0")/.."
CONFIG="${1:-wrangler.toml}"

echo "Currently logged in as:"
npx wrangler whoami
echo
read -r -p "Is this Cloudflare ACCOUNT 1 (the account with the motio2edit.com zone)? Type 'account1' to continue: " ANSWER
[ "$ANSWER" = "account1" ] || { echo "Aborted."; exit 1; }

echo
echo "Use a token created in Account 2 with: R2 > Object Read only > bucket motio2edit-assets-2."
echo "If Wrangler offers to create the Worker so it can hold secrets, answer yes (it creates an empty, unreachable Worker)."
echo
for NAME in R2_SECOND_ACCOUNT_ID R2_SECOND_ACCESS_KEY_ID R2_SECOND_SECRET_ACCESS_KEY; do
  echo "--> $NAME"
  npx wrangler secret put "$NAME" -c "$CONFIG"
done
echo
echo "Done. Listing secret names (values are never shown):"
npx wrangler secret list -c "$CONFIG"
