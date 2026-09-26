# Frame Studio (Motio2edit)

Standalone photo-frame UI served from this folder.

## Live URLs
- `/frame-studio/` → `index.html` (Frame Studio v7)
- `/frame-studio/frame-studio-v7.html` → same build

## Apply credits
Client POSTs to `/api/frame-studio/apply` with:
```json
{ "frameId": "…", "tier": "common|aiplus|premium", "cost": 5 }
```
Header: `Authorization: Bearer <supabase access token>`

## Demo plan switcher
Off in production (`CONFIG.showPlanSwitcher: false`). Plan/credits come from Motio account via the API.
