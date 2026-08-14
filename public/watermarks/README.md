# Motio2edit watermark assets

Transparent Motio2edit branding overlays used by the post-generation compositor.

- **Primary** (`watermark-primary-*`): bottom-right "Motio2edit" wordmark pill (digit 2 in brand orange `#f97316`).
- **Secondary** (`watermark-secondary-*`): top-left small Motio2edit icon mark (free / non-premium protection).

The live compositor (`src/lib/watermark.server.ts` / `src/lib/watermark.ts`) draws these marks **dynamically** from the **final output pixel dimensions** so every resolution (HD / 2K / 4K / portrait / landscape) scales correctly. The aspect-ratio files document the intended layout for each major ratio.

Pipeline: AI returns a clean image → Motio2edit compositor → download/export.
The AI provider is never instructed to generate this watermark.
