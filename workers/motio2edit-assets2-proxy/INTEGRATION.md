# Integration notes — Account 2 R2 via assets2.motio2edit.com

## What this Worker does

- Runs in **Cloudflare Account 1** (zone owner of `motio2edit.com`).
- Serves objects from **Account 2** bucket `motio2edit-assets-2` using Account 2 S3 credentials stored as Worker **secrets**.
- Public hostname target: `assets2.motio2edit.com` (production config only).
- Staging: `*.workers.dev` only — **no DNS change**.
- Intentionally has **no** `[[r2_buckets]]` binding → cannot touch Account 1 buckets.

## Critical: Vercel env vars ≠ Worker secrets

These Vercel Production variables already exist for the **app** runtime:

- `R2_SECOND_ACCOUNT_ID`
- `R2_SECOND_ACCESS_KEY_ID`
- `R2_SECOND_SECRET_ACCESS_KEY`
- `R2_SECOND_BUCKET_NAME`
- `R2_SECOND_ENDPOINT`

They are **not** available to this Worker. Worker secrets must be set with:

```bash
cd workers/motio2edit-assets2-proxy
npm install
npx wrangler login          # must be Account 1
npm run secrets             # or: bash scripts/set-secrets.sh
```

Use a **read-only** R2 API token from Account 2 scoped to bucket `motio2edit-assets-2`.

## Safe deploy sequence (do not skip)

1. **Upload at least one test object** into Account 2 bucket only (e.g. `_healthcheck/t1-<ts>.png`). Do not put it in Account 1.
2. Set Worker secrets on staging config (`wrangler.toml`).
3. `npm run deploy:staging`
4. Run verify:

```bash
BASE=https://motio2edit-assets2-proxy.<subdomain>.workers.dev \
KEY=_healthcheck/t1-....png \
node test/verify.mjs
```

5. Confirm:
   - GET/HEAD 200
   - `x-origin: r2-account2`
   - same KEY on `https://assets.motio2edit.com` returns **404**
   - cache HIT on second request
   - Range 206 for video if `VIDEO_KEY` set
6. Only after staging passes: `npm run deploy:production`  
   This attaches custom domain `assets2.motio2edit.com` (creates DNS in Account 1).  
   **Does not touch** the existing `assets` record.

## Website catalog (main app)

- Existing public samples stay on `https://assets.motio2edit.com` until you deliberately copy selected objects to Account 2 and switch their catalog URLs.
- Use `src/lib/r2-catalog-hosts.ts` (persistent mapping by key/prefix). No per-request random host.
- Private uploads, AI outputs, auth, payments, credits remain on Account 1 paths / signed URLs only.

## Manual actions only you can do

| Action | Who | Notes |
|--------|-----|--------|
| Create Account 2 R2 read token | You (Account 2) | Object Read only, bucket `motio2edit-assets-2` |
| `wrangler login` as Account 1 | You | Zone owner |
| Put Worker secrets | You | `npm run secrets` |
| Deploy staging Worker | You | After secrets |
| Upload test objects to Account 2 | You | Required for verify |
| Deploy production + custom domain | You | Only after staging green |
| Copy homepage assets Account1 → Account2 | You | Then flip catalog mapping |
| Account 2 analytics token for Class B proof | You | Optional; verify script supports it |

Vercel deploy does **not** deploy this Worker.
