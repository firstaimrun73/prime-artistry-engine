# Frame Studio — deploy notes

## Assets
- `public/frame-studio/index.html` — Frame Studio v7 (primary)
- `public/frame-studio/frame-studio-v7.html` — same build
- `public/frame-studio/logo.svg` — brand mark

## Backend
- `src/lib/frame-studio/credits.ts` — cost table (common 5 / aiplus 15 / premium 25)
- `src/lib/frame-studio/charge.server.ts` — `chargeFrameStudioApply`
- `src/routes/api/frame-studio.apply.ts` — `POST /api/frame-studio/apply`
- Migration: `supabase/migrations/20260926120000_frame_studio_ledger.sql`

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
