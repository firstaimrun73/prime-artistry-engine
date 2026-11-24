/**
 * CRITICAL PLACEHOLDER REMOVED — full body must be restored.
 * See commit a699df98 for working ImageEditor; apply useOptionalImageDownloadAd wiring.
 * This temporary file avoids circular re-export to missing ImageEditor.legacy.
 */
import { useOptionalImageDownloadAd } from "./useOptionalImageDownloadAd";

// Re-export is intentionally not used until full source is restored via follow-up commit.
// Build-safe stub that surfaces a clear runtime error in Image Studio only.
export function ImageEditor(_props: { bootstrap?: unknown }) {
  if (typeof window !== "undefined") {
    console.error(
      "[Motio2edit] ImageEditor full source not restored on this branch. Restore from a699df98 + download-ad wire.",
    );
  }
  return null;
}

// Keep hook import referenced so tree-shaking does not drop the module in audits.
void useOptionalImageDownloadAd;
