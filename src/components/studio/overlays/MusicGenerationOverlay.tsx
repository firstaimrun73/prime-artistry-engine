/**
 * MUSIC-only generation overlay identity (waveform / composition stages).
 * Isolated from Image and Video overlays.
 */
import { StudioGenerationOverlay } from "@/components/studio/StudioGenerationOverlay";
import type { StudioTier } from "@/lib/studio/studio-tier";
import type { StudioJobStage } from "@/lib/generation-status";

export function MusicGenerationOverlay(props: {
  tier: StudioTier;
  stage: StudioJobStage;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  coverEditor?: boolean;
}) {
  return <StudioGenerationOverlay kind="music" {...props} />;
}
