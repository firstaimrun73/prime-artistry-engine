# Scope check before I start

You sent three large batches (16 features across UI, editors, music, i18n, animations). Building all of it in one shot would take a lot of credits and risk regressions. I want to confirm priority order before I touch code.

Here's what I propose, grouped so each phase is independently shippable and typechecked:

## Phase 1 — Structural (highest impact, lowest risk)
1. **Separate editor routes**: `/studio/image`, `/studio/video`, `/studio/music` as dedicated pages. Wire Studio hub cards.
2. **Homepage Studio section**: 3 cards (Image free, Video/Music locked with upgrade overlay for free users), hover scale.
3. **Mobile bottom tab bar**: Home / Studio / History / Chat / Profile (desktop navbar unchanged).
4. **Dark/Light toggle in navbar** (already exists in settings via `theme.tsx`), default = system preference, orange accent both modes.

## Phase 2 — Music studio polish
5. BPM slider (60–180), 900-char counter (server already truncates).
6. Rotating vinyl loader + elapsed timer during generation.
7. Sunset/aurora gradient (#4B0082 → #8B008B → #FF69B4) on music page only.
8. Image/video mood-match upload (metadata only — real cross-modal conditioning isn't supported by the current music models; I'll pass a descriptive hint into the prompt).
9. Instrument image chips — I'll generate small PNGs for ~8 instruments (Guitar, Piano, Drums, Trumpet, Violin, Synth, Bass, Sax) with orange glow on selected.

## Phase 3 — Floating progress + mic
10. Global floating generation bar with countdown + progress, survives navigation (context + portal).
11. Mic button already exists (`VoiceInputButton`) — add a "Listening…" animated wave overlay.

## Phase 4 — i18n + homepage animations + polish
12. Language selector in navbar (browser detect, 22 Indian langs + English, searchable). **UI translation**: I'll wire the existing Google Translate widget rather than migrating the whole app to i18next (that would be a multi-day refactor). Prompt translation already happens in `prompt-enhance.server.ts`.
13. Homepage looping showcase (3 gradient slides, auto-advance 4s, disclaimer text).
14. Glass morphism styling on editor/music/studio/pricing cards.
15. Pricing: enlarge most-popular card with subtle pulse; music line already added last turn.
16. FAQs: strip "AI SaaS" wording, add search, prettier cards.
17. Admin ∞ audit pass (already done in `Header.tsx`, `music.functions.ts`, `generate.functions.ts` — I'll grep for any leftover call sites).

## What I need from you

- **Confirm phase order** above, or reorder.
- **Should I do all 4 phases in this session, or stop after Phase 1–2 so you can review?** All-in-one will consume significant credits and one bad typecheck can hold up shipping.
- **Full app UI translation**: OK to use the existing Google Translate widget approach, or do you want a real i18next migration (much larger job, separate task)?
- **Mood-match music from image/video**: confirm "descriptive hint fed into prompt" is acceptable — no music model on fal currently accepts image/video conditioning input.

Reply with phase order + answers to the two questions and I'll start building.
