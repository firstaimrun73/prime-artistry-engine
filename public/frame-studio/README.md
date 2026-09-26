# Frame Studio (Motio2edit)

Standalone photo-frame UI.

## URLs
- `/frame-studio/` — Frame Studio v7

## Apply credits
POST `/api/frame-studio/apply`
```json
{ "frameId": "…", "tier": "common|aiplus|premium", "cost": 5 }
```
Header: `Authorization: Bearer <supabase access token>`

Plan switcher is off in production. Plan/credits come from Motio account via the API.
