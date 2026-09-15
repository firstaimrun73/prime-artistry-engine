# Lenses WebAR Implementation Audit & Plan

**Status:** Audit Complete  
**Date:** 2026-09-15  
**Scope:** Lenses module only; Filters OUT OF SCOPE

---

## Executive Summary

The repository already has a **partial Lenses implementation** with:
- ✅ Optical lens roster (20 lenses defined)
- ✅ Canvas-based image processing (on-device filters)
- ✅ Camera/upload UI (LensEditor component)
- ✅ Billing integration (AI lens charging system)
- ✅ Watermark overlay for free tier

**Missing from specification:**
- ❌ WebAR/3D rendering (Three.js, camera matrix calibration)
- ❌ Face tracking (AI-driven facial gesture response)
- ❌ Adaptive quality rendering layer
- ❌ Gesture capture pipeline
- ❌ Output screen/watermark/share UI refinements
- ❌ Full Lovable documentation sync

---

## Current Repository Architecture

```
src/
├── lib/lens-camera/
│   ├── roster.ts                    # Lens definitions (20 lenses)
│   ├── optical-engine.ts            # Public lens API
│   ├── lens-generation.functions.ts # Billing integration
│   ├── lens-samples.ts              # R2 sample images
│   ├── aspect.ts                    # Aspect ratio analysis
│   ├── opt-core.ts                  # Canvas helpers
│   ├── opt-warp.ts                  # Geometric distortions
│   ├── opt-fx1.ts                   # FX set 1 (portrait, dream, glow, etc.)
│   └── opt-fx2.ts                   # FX set 2 (tilt-shift, prism, starflare, etc.)
├── components/lens-camera/
│   └── LensEditor.tsx               # Main camera/upload UI
└── routes/studio.image.lens-editor.tsx  # Route entry point

Key integrations:
- Supabase for auth + billing
- R2 CDN for sample images (assets.motio2edit.com/samples/lenses)
- Web Audio API for shutter click
- getUserMedia() for camera access
```

---

## Audit Findings

### ✅ Existing Strengths

1. **Lens Roster (roster.ts):**
   - 20 lenses fully defined with metadata (name, code, color, concept, tier, creditCost)
   - Tiers: "ai" (charged) vs "normal" (free, on-device)
   - Status enum: "full", "preview-only", "coming-soon"
   - Default selection = NONE (user must pick)

2. **Optical Processing (opt-*.ts):**
   - Canvas 2D API (no WebGL yet)
   - Bilinear sampling for smooth warps
   - 20+ lens recipes (radial maps, fisheye, bokeh, tilt-shift, etc.)
   - Filter grading system (contrast, saturation, brightness)
   - Aspect ratio preservation

3. **Camera UI (LensEditor.tsx):**
   - Front/rear camera toggle
   - Live optical preview at 480px (performance-optimized rAF loop)
   - Still image upload fallback
   - Photo capture with shutter sound
   - Free tier watermark placement
   - Name chip notification (transient toast)

4. **Billing (lens-generation.functions.ts):**
   - Server function with auth middleware
   - Credit deduction via `deduct_credits` RPC
   - Free tier (normal lenses) = no charge
   - AI tier = 20 credits per use
   - Admin bypass for testing

### ❌ Missing Features

| Feature | Current | Spec | Priority |
|---------|---------|------|----------|
| **3D/WebAR Rendering** | None | Three.js + camera matrix | HIGH |
| **Face Tracking** | None | ML-based (TensorFlow?) | HIGH |
| **Gesture Capture** | None | Facial expression→lens response | HIGH |
| **Adaptive Quality Layer** | None | Performance-based downscaling | MEDIUM |
| **Capture Pipeline** | Basic canvas | Full watermark + metadata | MEDIUM |
| **Share/Social** | None | One-tap social share | LOW |
| **Accessibility** | Partial | Screen reader + ARIA | LOW |
| **Testing Coverage** | None | Unit + E2E | MEDIUM |

---

## Implementation Plan (Phased)

### Phase 1: Foundation (Stable)
**Goal:** Restore WebAR 3D rendering + face tracking
- [ ] Add Three.js dependency
- [ ] Build CameraMatrix calibration system
- [ ] Integrate ML face tracking (TensorFlow Lite)
- [ ] Refactor LensEditor to support 3D pipeline
- [ ] Update optical-engine.ts with adaptive quality

### Phase 2: Gesture + UX Polish
**Goal:** Facial expression response + refined capture
- [ ] Implement FacialGestureExpressionSystem
- [ ] Add gesture→lens mapping
- [ ] Enhance capture UI (Watermark, Share buttons)
- [ ] Update share modal (Instagram, WhatsApp, etc.)

### Phase 3: Testing & Documentation
**Goal:** QA + Spec alignment
- [ ] Unit tests (roster, optical transforms)
- [ ] E2E camera tests
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Lovable sync + deployment

---

## Smallest Safe Diff Strategy

**To keep changes isolated:**

1. **Create new module: `src/lib/lens-camera/webar-core.ts`**
   - Three.js scene setup
   - Camera matrix calibration
   - Face tracking pipeline (factory pattern for ML models)
   - Gesture expression system (isolated enum + handlers)

2. **Extend optical-engine.ts:**
   - New `applyLens3D()` function (optional, fallback to 2D)
   - Feature detection (WebGL, camera API)
   - Adaptive quality logic

3. **Update LensEditor.tsx:**
   - Feature flag: `USE_WEBAR_3D` (default false initially)
   - Graceful fallback to existing 2D pipeline
   - No breaking changes to existing props/state

4. **Preserve existing:**
   - All on-device canvas filters (opt-*.ts) — unchanged
   - Roster metadata — unchanged
   - Billing system — unchanged
   - Routes — unchanged

---

## File Structure After Phase 1

```
src/lib/lens-camera/
├── roster.ts                        (existing)
├── optical-engine.ts                (existing + new 3D wrapper)
├── lens-generation.functions.ts     (existing)
├── opt-core.ts                      (existing)
├── opt-warp.ts                      (existing)
├── opt-fx1.ts                       (existing)
├── opt-fx2.ts                       (existing)
├── opt-switch.ts                    (existing)
├── lens-samples.ts                  (existing)
├── aspect.ts                        (existing)
├── webar-core.ts                    ← NEW: 3D rendering
├── webar-face-tracking.ts           ← NEW: Face detection
├── webar-gesture-system.ts          ← NEW: Expression mapping
└── webar-quality.ts                 ← NEW: Adaptive rendering

src/components/lens-camera/
├── LensEditor.tsx                   (updated with 3D fallback)
└── LensEditor3D.tsx                 ← NEW: 3D variant (feature-flagged)
```

---

## Acceptance Criteria

✅ **Phase 1 must:**
- [ ] Load Three.js without blocking page load
- [ ] Detect camera calibration (intrinsics) from device
- [ ] Initialize face tracking (detect when available)
- [ ] Render 3D lens preview at 60fps (target)
- [ ] Fall back gracefully if WebGL unavailable
- [ ] No regression in existing 2D lens pipeline
- [ ] All existing tests pass

✅ **Phase 2 must:**
- [ ] Map 5+ facial expressions to lens effects
- [ ] Capture + save gesture metadata
- [ ] Show social share buttons (Instagram, WhatsApp)
- [ ] Watermark follows spec placement (bottom-right)
- [ ] No unauthorized data collection

✅ **Phase 3 must:**
- [ ] ≥80% unit test coverage (lib/lens-camera)
- [ ] E2E tests for camera + capture flow
- [ ] WCAG 2.1 Level AA compliance
- [ ] Full spec documentation update

---

## Dependencies to Add

```json
{
  "three": "^r128",                    // 3D rendering
  "@tensorflow/tfjs": "^4.x",          // ML ops
  "@tensorflow-models/face-detection": "^0.0.7", // Face tracking
  "three-mrtkjs": "^1.x"               // Optional: MR toolkit
}
```

---

## Next Steps

1. **Create feature branch:** `feat/lenses-webar-phase1`
2. **Build webar-core.ts** (stub Three.js scene)
3. **Integrate face tracking** (mock first, then TF Lite)
4. **Update optical-engine.ts** with 3D wrapper
5. **Add feature flag** to LensEditor
6. **Test graceful fallback** to 2D
7. **Create PR** for review + Lovable sync

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **WebGL unavailable** | Fallback to 2D canvas filters (existing) |
| **Camera permission denied** | Show UI hint, allow upload-only mode |
| **Face tracking latency** | Enable adaptive FPS (60→30→15fps) |
| **Model download delay** | Cache to IndexedDB, lazy-load on first use |
| **Breaking existing users** | Feature flag OFF by default, A/B test rollout |
| **Lovable sync conflicts** | Avoid rewriting published git history |

---

## References

- **Spec PDF:** `Motio2edit_Lenses_WebAR_Spec.pdf` (uploaded)
- **Existing Code:** See `src/lib/lens-camera/` and `src/components/lens-camera/`
- **Lovable Note:** Do NOT force-push or rebase; keep branch clean for Lovable editor
- **Build:** `npm run build` (TanStack Start, Vite)

