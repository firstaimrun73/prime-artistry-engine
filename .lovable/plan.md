# Mot2Edit / Motion2AI — Phased Build Plan

This spec touches ~40 files across brand, routing, editors, generation UX, i18n, and design system. Shipping it in one turn would burn credits and risk breakage. I'll ship it in 6 phases, each independently verifiable. You approve, I execute phase-by-phase (or ask me to run all sequentially).

---

## Phase 1 — Structural & Brand (Sections 1, 3, 9, 13)
Foundational — unblocks the rest.

- **Rebrand copy**: rename product surface to "Mot2Edit, powered by Motion2AI". Update `Header`, `Footer`, FAQ, `__root` metadata, index `<title>`. Strip any "AI SaaS / third-party AI" phrasing.
- **Split Image vs Video editors**: `/studio/image` and `/studio/video` become real, distinct routes with their own layouts. Retire the dual-mode `_authenticated.editor.tsx` shell; move its image logic into `studio.image.tsx` and video logic into `studio.video.tsx`. `/editor` becomes a redirect based on `sessionStorage` mode.
- **Nav split**: desktop → vertical left sidebar (Home, Editor Hub, Plans, Support, Settings). Mobile → keep current `BottomTabBar`. Header becomes a slim top bar only. Content pushes, never overlaps.
- **Settings additions**: dark/light toggle, language override, nav-side override.
- **Global disclaimer line** shown on every editor bottom toolbar.

## Phase 2 — Editor Hub & Homepage (Sections 2, 6, 7 partial)
- Homepage becomes entry-only. Remove `StudioShowcase` cards and add an auto-rotating PPT-style carousel (Image → Video → Music) with 3–4 bullets each, gradient identity per slide, and a "Learn more" CTA.
- Add `/studio` Editor Hub as the single click-through: Image unlocked, Video + Music show frosted-glass lock overlay with feature summary for free users.
- Introduce per-editor gradient tokens in `styles.css`: Image (orange), Video (red), Music (sunset-aura violet-magenta). Light + dark variants each. Subtle animated gradient (breathing).

## Phase 3 — Floating Generation Bar (Section 8)
- New `GenerationStatusProvider` context in `src/lib/generation-status.tsx` holding {editor, startedAt, status, cancel}.
- New `FloatingStatusBar` component: draggable (pointer events), persistent across routes (mounted in `__root`), live timer, per-editor animation (image reveal, video build, music stick-figure playing selected instrument), cancel button, completion toast + `Notification` API.
- Wire image/video/music server-fn callers to publish start/progress/completion into the provider.

## Phase 4 — Editor Fixes & Mic (Sections 4, 5)
- **Music prompt accuracy fix**: audit `src/lib/music.functions.ts` prompt composition; strengthen instruction framing and reduce filler descriptors that dilute intent.
- **Image-to-image fix**: verify mediaUrl reaches FAL for the current model; if broken, restore signed-URL upload + strength floor.
- **Image-to-Music + Video-to-Music**: add upload inputs in music editor, extend `generateMusic` server fn with `mediaUrl` + `mediaType`, pass to model.
- **BPM control** (slider + numeric).
- **Instrument tiles**: generate AI illustration per instrument (guitar, piano, drums, violin, synth, sax, flute, bass) via `imagegen`, store under `src/assets/instruments/`, replace text/emoji chips.
- **Mic input** on all three editors via existing `VoiceInputButton`, plus a floating "Say something…" overlay with wave-bar animation while active.
- **Lite vs Pro** music tier already exists — surface it clearly and gate Pro-only features (BPM, longer duration, multi-instrument).

## Phase 5 — Localization (Section 10)
- IP → country via existing `src/lib/geo.ts`.
- Add `src/lib/i18n.tsx` with a language map (all 22 Indian scheduled languages + English + major regional defaults). Country → default language table.
- Navbar language picker with search box; manual override persists to localStorage.
- Wrap key UI strings in `t()` (header, nav, hub, editor labels, buttons, pricing headings). Full-site translation is a marathon — Phase 5 delivers infra + top ~150 strings; long-tail strings translate progressively.

## Phase 6 — Polish (Sections 11, 12, 7 finish)
- Pricing page: asymmetric card sizing, recommended plan visually dominant, glass finish, subtle motion.
- FAQ + Support redesigned to match glass + gradient system; FAQ copy rewritten vendor-neutral.
- Global motion pass: button hover/press micro-interactions, glass surfaces on cards/nav/modals.
- Motion2AI credit badge inside each editor's loading animation.

---

## Technical notes

- Framework: TanStack Start v1 file routes. New routes live under `src/routes/`. Provider mounts in `__root.tsx`.
- Music image/video input requires FAL model support — if the current CassetteAI/Stable Audio models don't accept media conditioning, I'll fall back to: extract mood/tempo from the media via a vision chat call, feed those into the existing prompt pipeline. I'll confirm which route once I test.
- Notifications use `window.Notification` with permission request on first generation start.
- Draggable bar: pointer events + `transform`, position saved to localStorage.
- Instrument art: 8 images via `imagegen` (fast tier) — ~8 image credits total.
- No DB migrations expected in phases 1–3; phase 4 may need a `music_input_url` column on `generations` (small migration).

---

## Ask

Reply **"go phase 1"** (or "go all") and I'll start. If you want to reorder or cut any phase, tell me now — this is the cheapest moment to change scope.
