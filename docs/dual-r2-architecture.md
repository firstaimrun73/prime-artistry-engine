# Dual Cloudflare R2 architecture (Motio2edit)

## Goal

One unified storage system using **both** Cloudflare accounts without transferring the domain and without breaking existing URLs.

## Architecture (chosen)

```
Browser / App
    │
    ├─ Public samples (existing keys) ──► https://assets.motio2edit.com
    │                                      └─ Account 1 R2: motio2edit-media
    │
    ├─ Public samples (Account 2 keys) ──► https://assets2.motio2edit.com
    │         (only after Worker verified)   └─ Account 1 Worker
    │                                              └─ S3 API → Account 2 R2: motio2edit-assets-2
    │
    └─ Private user media ──► signed URLs from Vercel server
                               └─ Account 1 R2: motio2edit-user-media (and Blob for free tier)
```

| Concern | Where |
|--------|--------|
| Domain / DNS zone | Account 1 only (no transfer) |
| Existing public CDN | `assets.motio2edit.com` unchanged |
| Account 2 public reads | Worker in Account 1 + Account 2 read credentials as **Worker secrets** |
| Uploads / registry | Vercel server (`src/lib/r2-dual.server.ts` + existing `r2.server.ts`) |
| Object location | `storage_provider`: `r2` (Account 1) or `r2-a2` (Account 2) + `r2_object_key` |

Domain is **not** moved to Account 2. Account 2 is reached only via S3-compatible API.

## Feature flags (defaults = safe)

| Flag | Default | Effect |
|------|---------|--------|
| `R2_DUAL_UPLOAD_ENABLED` | off | When `true`/`1`, new public puts may go to Account 2 |
| `R2_ACCOUNT2_UPLOAD_PERCENT` | `0` | 0–100 capacity-aware share for new public objects |
| `R2_ACCOUNT2_ENABLED` in `r2-catalog-hosts.ts` | `false` | Public browser host for Account 2 keys |

Private `users/**` always routes to Account 1 unless a future explicit policy changes that.

## Location registry

Existing columns are enough:

- `generations.r2_object_key` — object key
- `generations.storage_provider` — `r2` | `r2-a2` | `blob` | …

Helpers: `storageProviderForAccount`, `accountFromStorageProvider`, `dualR2ResolveDelivery` in `src/lib/r2-dual.server.ts`.

## Worker (public Account 2 gateway)

Project: `workers/motio2edit-assets2-proxy/`

- Staging: `npm run deploy:staging` (workers.dev, no DNS)
- Production: only after staging verify — attaches `assets2.motio2edit.com`
- Secrets (Worker, Account 1): `R2_SECOND_ACCOUNT_ID`, `R2_SECOND_ACCESS_KEY_ID`, `R2_SECOND_SECRET_ACCESS_KEY`
- Caching: Workers Cache enabled; Range/video supported

Vercel `R2_SECOND_*` env vars are **not** Worker secrets.

## Production safety

- Do not delete or overwrite existing production keys.
- Do not enable dual upload or assets2 host until staging Worker checks pass.
- Do not change the `assets` DNS record.
- Credentials never in frontend code.

## Rollback

1. Set `R2_DUAL_UPLOAD_ENABLED` unset/false on Vercel → all new uploads Account 1.
2. Keep `R2_ACCOUNT2_ENABLED = false` → all catalog URLs use Account 1 host.
3. Leave existing Account 1 objects in place (nothing to restore).
4. Optional: disable/delete Worker route for `assets2` if production was attached.

## Monitoring

- Account 1 / 2 R2 dashboards: storage, Class A/B ops, errors
- Worker analytics: requests, cache HIT rate (`cf-cache-status`), 4xx/5xx
- App: log dual put fallbacks (`[r2-dual] Account 2 put failed…`)
- `dualR2Status()` for admin health (no secrets)

## Required dashboard / secret checklist

See `docs/dual-r2-runbook.md`.
