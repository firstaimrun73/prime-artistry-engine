/**
 * VIDEO-only generation overlay identity.
 * Does not share animation concepts with Image or Music.
 */
import { StudioGenerationOverlay } from "@/components/studio/StudioGenerationOverlay";
import type { StudioTier } from "@/lib/studio/studio-tier";
import type { StudioJobStage } from "@/lib/generation-status";

export function VideoGenerationOverlay(props: {
  tier: StudioTier;
  stage: StudioJobStage;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  coverEditor?: boolean;
}) {
  return <StudioGenerationOverlay kind="video" {...props} />;
}
