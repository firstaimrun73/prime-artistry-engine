# motio2edit-assets2-proxy

Public, read-only Worker that serves the **Account 2** R2 bucket `motio2edit-assets-2` from
`assets2.motio2edit.com`, while the Worker itself lives in **Account 1** (the account that owns the
`motio2edit.com` zone).

```
browser ──► assets2.motio2edit.com (Worker Custom Domain, Account 1)
              │  Workers Caching checks cache FIRST ── HIT ──► response (no Worker run, no R2 read)
              │  MISS
              ▼
            Worker (signs request with Account 2 read-only credentials)
              ▼
            https://<ACCOUNT2_ID>.r2.cloudflarestorage.com/motio2edit-assets-2/<key>   ← billed to Account 2
```

## Safety properties

- No `[[r2_buckets]]` binding in either wrangler file → the Worker **cannot** read any Account 1 bucket.
- Nothing here touches Namecheap, the `assets` DNS record, `motio2edit-media`, `motio2edit-user-media`,
  `motio2edit-frames`, Supabase, payments, or the website.
- Secrets never appear in files or chat. They are entered into Wrangler's hidden prompt.
- Read-only: only GET / HEAD / OPTIONS. No listing (`/` → 404, query strings other than `v` → 400).
- The staging config (`wrangler.toml`) has **no DNS change**. Only `wrangler.production.toml` adds the custom domain.

## 0. Before anything: be logged in to Account 1

```bash
cd motio2edit-assets2-proxy
npm install
npx wrangler login
npx wrangler whoami          # must show ACCOUNT 1 (the one with motio2edit.com). If not: npx wrangler logout, log in again.
```

## 1. Prepare Account 2 (manual, in the Account 2 dashboard)

Create a read-only R2 API token for bucket `motio2edit-assets-2` (Object Read only).
Upload a test object that exists **only** in Account 2, e.g. `_healthcheck/t1-<timestamp>.png`.

## 2. Secrets

```bash
npm run secrets
```

Type `account1` when asked, then enter Account 2 credentials into Wrangler's hidden prompts.

## 3. Staging deploy (no DNS)

```bash
npm run deploy:staging
```

## 4. Verify

```bash
BASE=https://motio2edit-assets2-proxy.<subdomain>.workers.dev \
KEY=_healthcheck/t1-<timestamp>.png \
node test/verify.mjs
```

## 5. Production (only after staging is green)

```bash
npm run deploy:production
```

Attaches `assets2.motio2edit.com`. Does not touch `assets.motio2edit.com`.

## Files

```
wrangler.toml              staging (workers.dev only)
wrangler.production.toml   custom domain assets2.motio2edit.com
src/index.js               Worker
scripts/set-secrets.sh     secret setup with Account 1 safety check
test/verify.mjs            end-to-end verification
.dev.vars.example          names only
INTEGRATION.md             app integration notes
```

## Honest trade-off

Workers requests bill to Account 1 (including cache hits). R2 Class B reads on misses bill to Account 2.
Caching is what reduces Class B volume. At homepage scale most traffic should be HITs.

See full costs table and caching notes in the original Claude package README if needed for pricing figures.
