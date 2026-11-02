# Dual R2 runbook — secrets, dashboard, test, rollback

## Cloudflare dashboard actions (you)

### Account 2

1. R2 → bucket `motio2edit-assets-2` exists.
2. Manage R2 API Tokens → Create token:
   - Permission: **Object Read** (and Object Write if Vercel will upload to Account 2).
   - Bucket: `motio2edit-assets-2` only.
3. Save Access Key ID + Secret Access Key privately (never chat/GitHub).
4. Upload a test object that exists **only** in Account 2, e.g. `_healthcheck/t1-<timestamp>.png`.

Optional write token: if dual upload is enabled, the Vercel token needs Object Read & Write on that bucket.

### Account 1

1. Confirm zone `motio2edit.com` and existing public hostname `assets.motio2edit.com` → `motio2edit-media` (do not edit).
2. Workers & Pages → open or create Worker `motio2edit-assets2-proxy`.
3. Connect Workers Builds to repo `firstaimrun73/prime-artistry-engine` with root directory `workers/motio2edit-assets2-proxy` and deploy command equivalent to `npm run deploy:staging` / `wrangler deploy` (staging config).
4. Worker → Settings → Variables and Secrets — set secrets below.
5. Deploy **staging** only first (workers.dev). No custom domain until verify passes.

## Secrets

### Worker secrets (Account 1 Worker — set in Cloudflare UI or `npm run secrets`)

| Name | Source |
|------|--------|
| `R2_SECOND_ACCOUNT_ID` | Account 2 account id |
| `R2_SECOND_ACCESS_KEY_ID` | Account 2 R2 API token |
| `R2_SECOND_SECRET_ACCESS_KEY` | Account 2 R2 API token secret |

Non-secret vars (already in `wrangler.toml`): `R2_SECOND_BUCKET_NAME=motio2edit-assets-2`, cache/CORS settings.

### Vercel env (app server — for dual upload / signed Account 2 reads)

Already documented as present; confirm Production:

| Name | Purpose |
|------|--------|
| `R2_SECOND_ACCOUNT_ID` | Account 2 |
| `R2_SECOND_ACCESS_KEY_ID` | Account 2 (read/write if uploading) |
| `R2_SECOND_SECRET_ACCESS_KEY` | Account 2 |
| `R2_SECOND_BUCKET_NAME` | `motio2edit-assets-2` |
| `R2_SECOND_ENDPOINT` | `https://<ACCOUNT2_ID>.r2.cloudflarestorage.com` |
| `R2_DUAL_UPLOAD_ENABLED` | leave **unset** until ready |
| `R2_ACCOUNT2_UPLOAD_PERCENT` | e.g. `20` when enabling dual upload |

Account 1 vars unchanged: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_*`, user-media vars.

## Staging verify (Worker)

```bash
cd workers/motio2edit-assets2-proxy
npm install
BASE=https://motio2edit-assets2-proxy.<subdomain>.workers.dev \
KEY=_healthcheck/t1-<timestamp>.png \
node test/verify.mjs
```

Must see: GET/HEAD 200, `x-origin: r2-account2`, same key 404 on `assets.motio2edit.com`, cache HIT on second GET, Range 206 if `VIDEO_KEY` set.

## Enable dual upload (after Worker green)

1. Vercel: `R2_DUAL_UPLOAD_ENABLED=true`, `R2_ACCOUNT2_UPLOAD_PERCENT=10` (start low).
2. App code paths that create **new public** objects call `dualR2PutObject` and persist `storage_provider` + `r2_object_key`.
3. Leave `R2_ACCOUNT2_ENABLED = false` in `r2-catalog-hosts.ts` until production Worker domain is attached and verified.
4. Production Worker: `npm run deploy:production` only when you accept `assets2.motio2edit.com` DNS creation (does not touch `assets`).

## Test matrix

| Test | How |
|------|-----|
| Upload Account 1 | dual off or percent 0 → `storage_provider=r2` |
| Upload Account 2 | dual on, force or percent → `storage_provider=r2-a2`; confirm object in Account 2 bucket |
| Retrieve both | `dualR2ResolveDelivery` / signed GET |
| Existing image URL | `https://assets.motio2edit.com/...` still 200 |
| Video seek | Range on Worker BASE |
| Large upload | put via dual with multi-MB body |
| Cache | second GET `cf-cache-status: HIT` |
| Account 2 failure | revoke/wrong secret → put falls back to Account 1, log line present |

## Rollback

1. Unset `R2_DUAL_UPLOAD_ENABLED`.
2. Keep catalog flag false.
3. Do not delete Account 1 data.
4. Optional: remove assets2 custom domain from Worker.
