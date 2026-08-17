# MOTIO2EDIT Auto — Frontend Blueprint

Handoff document for the dedicated Auto Edit experience.

## Route

- **Path:** `/studio/image/auto-edit`
- **File:** `src/routes/studio.image.auto-edit.tsx`
- Preserved existing route; did not create a competing route.

## Product name (visible UI)

- **MOTIO2EDIT Auto**
- Primary action communicates **Auto AI** with a tasteful **Maluto ai ↔ Auto ai** text transition.
- Do not use Motio2Auto / Motio2Auto Edit / MOTIO2EDIT Auto AI in visible chrome.

## Two experiences (remain separate)

| Experience | Entry | Behaviour |
|---|---|---|
| **Dedicated Nav Auto** | `/studio/image/auto-edit` | One image → automatic analysis → automatic edit → output |
| **Image Studio Auto** | Image Studio tools | Loaded image + optional user prompt/editor commands |

This blueprint covers the dedicated page only. Image Studio Auto must not be broken.

## Backend contract (source of truth in repo)

There are **no** `startMotio2EditAutoRun` / `getMotio2EditAutoStatus` / `reportMotio2EditAutoProgress` functions in this repository.

Actual integration:

1. **Client upload** → Supabase `uploads` bucket → signed HTTPS URL  
2. **`prepareAutoEditRun`** (`src/lib/auto-edit/run.functions.ts`)  
   - Auth middleware  
   - Vision/fallback analysis via `analyze.server`  
   - Plan + internal steps via `pipeline.service`  
   - Returns `{ status, message, steps: [{ operationId, strength, internalPrompt }] }`  
3. **Client loop** calls **`generateMedia`** once per step with `internalPrompt` (never shown in UI)  
4. **Secure download** via `secureDownloadImage` + `triggerBrowserDownload` (watermark on download path)

Related modules (untouched unless required):

- `src/lib/auto-edit/analyze.server.ts`
- `src/lib/auto-edit/decision.ts`
- `src/lib/auto-edit/operations.ts`
- `src/lib/auto-edit/autoPrompts.ts`
- `src/lib/auto-edit/mergeInstructions.ts`
- `src/lib/auto-edit/postProcess.ts`
- `src/lib/auto-edit/orchestrator.ts` (server-side composition helper; dedicated UI uses prepare + generate)
- `src/lib/watermark*.ts`, `src/lib/download.functions.ts`

## Component tree

```
AutoEditPage (route)
├── Header
├── INPUT panel (glass)
│   ├── Dropzone / file input (one image)
│   ├── Preview + dimensions + filename
│   └── Change / Remove
├── OUTPUT panel (glass)
│   ├── Empty state
│   ├── CompareSlider (when before + after available)
│   └── Download (secure)
├── Quality chips (existing IMAGE_QUALITY_OPTIONS)
├── Primary CTA — MalutoAutoLabel (Maluto ai ↔ Auto ai)
├── Error alert (retry / back)
└── Processing overlay (phase === processing)
    ├── Adaptive wallpaper (palette from input + CSS pattern)
    └── Glass card
        ├── Title MOTIO2EDIT Auto
        ├── Safe status / procedure
        ├── Large %
        ├── Progress bar
        ├── ETA (informational)
        ├── Mini source thumb
        └── Procedure timeline
```

Reuse:

- `@/components/ui/button`, `progress`
- `@/components/CompareSlider`
- `@/components/Header`
- Existing `glass-panel` utility in `src/styles.css`

## State machine

```
idle ──run──► processing ──success──► done
                  │
                  ├── NO_CHANGE ──► done (output = original preview)
                  └── ERROR ──► error (retry / exit)
```

Stages during `processing` (UI-mapped; progress never claims complete until real finish):

| Stage | Meaning |
|---|---|
| queued | Started |
| analysing | Before/during prepare |
| storing | Upload to storage |
| searching | prepareAutoEditRun (decision) |
| applying | Steps ready |
| generating | generateMedia loop |
| validating | Post-gen soft step |
| watermarking | UI note; real WM on download |
| finalising | Transition out |
| complete / no_change / error | Terminal |

## Upload behaviour

- Exactly **one** image
- Types: image/* ; max 25 MB
- Multi-file drop/select → clear message, no run
- Signed URL only after upload

## Input / output

- Desktop: balanced two-column INPUT | OUTPUT
- Mobile: stacked, no horizontal overflow
- Output empty state until real result
- NO_CHANGE: show original; message “No automatic changes needed”

## Processing overlay

- Covers application viewport (fixed inset-0)
- Blocks interaction with workspace
- Adaptive wallpaper from client-side dominant colour of input (canvas sample)
- Original CSS/SVG pattern only (no unlicensed assets)
- Glass panel with status, %, bar, timeline, ETA

## Progress

- Driven by real prepare + generate steps
- Smooth interpolation toward stage targets only
- Never shows 100% until complete / no_change

## Status timeline

Completed: checkmark, quieter  
Current: highlighted, subtle pulse  
Future: subdued  
Never shows internal prompts or reasoning

## Glass UI

Uses project tokens + `glass-panel`:

- Translucent surfaces, backdrop blur, soft borders
- Primary accent oklch orange already in theme

## Animation

- Maluto ai ↔ Auto ai ~2.8s crossfade; disabled when `prefers-reduced-motion`
- Overlay entrance via existing layout
- Timeline pulse on current step only
- No particle storms / heavy CPU effects

## Mobile

- Full viewport overlay
- Safe-area padding
- Large %
- Touch targets ≥ 40px
- Stacked panels

## Desktop

- Workspace max-w-6xl
- Overlay over content (not browser chrome hijack)

## Accessibility

- Dialog role + aria-modal + aria-live on overlay
- Accessible button names
- Alt text on images
- Focusable controls; visible focus rings
- Reduced motion respected for label cycle

## Error states

- Friendly message only (no stack traces / secrets)
- Retry + back to Image Studio
- User is not trapped in overlay after error

## Cancel

- Backend does not expose cancel for this flow → **no fake Cancel button**

## Files

### Created

- `docs/MOTIO2EDIT_AUTO_FRONTEND_BLUEPRINT.md`

### Modified

- `src/routes/studio.image.auto-edit.tsx`

### Intentionally untouched

- Image Studio routes/tools (`studio.image.tsx`, `studio.image.tools.tsx`, editor)
- Auto-edit backend modules
- Watermark / generate / auth systems
- Navigation structure (route already existed)

## Known limitations

1. No job polling API — progress is client-orchestrated around real server calls.
2. Watermark stage is informational; enforcement remains on secure download.
3. ETA is heuristic (informational only).
4. Automated browser e2e for this flow not present in repo scripts.

## Verification checklist (manual)

- [ ] One valid image upload + preview
- [ ] Start Auto AI → overlay + timeline + %
- [ ] Result + CompareSlider + secure download
- [ ] NO_CHANGE path
- [ ] Error + retry
- [ ] Multi-image rejection
- [ ] Mobile / desktop layout
- [ ] Reduced motion
- [ ] Image Studio still loads and works
