# Frame Studio — logo + backend deploy notes

## Assets
- `public/frame-studio/logo.svg` — warm brown frame-corner mark
- `public/frame-studio/favicon-32.png`, `favicon-180.png` (generate from logo.svg if needed)
- `public/frame-studio/frame-studio-v5.html` — UI (catalog/textures/costs unchanged)

## Backend
- `src/lib/frame-studio/credits.ts` — cost table
- `src/lib/frame-studio/charge.server.ts` — `chargeFrameStudioApply` server fn
- `src/routes/api/frame-studio.apply.ts` — HTTP `POST /api/frame-studio/apply`
- Migration: `supabase/migrations/20260926120000_frame_studio_ledger.sql`

## Env vars (already used by Motio2edit)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (via supabaseAdmin)

## Client contract
POST `/api/frame-studio/apply`
```json
{ "frameId": "…", "tier": "common|aiplus|premium", "cost": 5 }
```
Headers: `Authorization: Bearer <supabase access token>`

Responses:
- `{ ok: true, credits, plan, charged }`
- `{ ok: false, reason: "auth"|"plan"|"credits"|"error", message }`

Admin (sole admin email) skips plan + credit checks and does not deduct.

## Motio plan mapping
| Motio plan | Frame Studio access |
|------------|---------------------|
| free       | common only         |
| plus/lite  | common + aiplus     |
| pro/studio/business | all tiers   |
