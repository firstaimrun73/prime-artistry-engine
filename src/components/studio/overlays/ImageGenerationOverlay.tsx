/**
 * IMAGE-only generation overlay identity.
 * Thin adapter so Image Editor never imports Video/Music overlay code.
 */
import { StudioGenerationOverlay } from "@/components/studio/StudioGenerationOverlay";
import type { StudioTier } from "@/lib/studio/studio-tier";
import type { StudioJobStage } from "@/lib/generation-status";

export function ImageGenerationOverlay(props: {
  tier: StudioTier;
  stage: StudioJobStage;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  coverEditor?: boolean;
}) {
  return <StudioGenerationOverlay kind="image" {...props} />;
}
