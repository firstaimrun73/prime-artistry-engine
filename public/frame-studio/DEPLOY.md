# Frame Studio — deploy notes

## Live
- `/frame-studio/` → `index.html` loads Frame Studio v7 (zlib parts)

## Assets
- `frame-studio-v7.z.b64.part0` … `part2` — zlib+base64 of full HTML
- `logo.svg` — brand mark

## Backend
- `POST /api/frame-studio/apply` with Bearer token
- Body: `{ "frameId", "tier": "common|aiplus|premium", "cost" }`
- Costs: common 5 / aiplus 15 / premium 25

Admin (sole admin email) skips plan + credit checks.
