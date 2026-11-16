/**
 * Smart Auto settings for Studio composers.
 * Heuristics only — no remote LLM call. Results are labelled honestly as Auto-selected.
 */

import type { StudioTier } from "@/lib/studio/studio-tier";
import type { ImageQuality } from "@/lib/quality-options";

export type StudioKind = "image" | "video" | "music";

/** Product durations from video-capability-registry */
export const VIDEO_DURATIONS_STANDARD = [5, 10] as const;
export const VIDEO_DURATIONS_PREMIUM = [5, 10, 15] as const;

export type ParsedDuration = {
  requestedSec: number | null;
  /** Nearest supported duration for the active product mode */
  selectedSec: number;
  exactMatch: boolean;
  /** Human message when request is unsupported */
  note: string | null;
};

/**
 * Extract an explicit duration from free-text prompts.
 * Handles: "5-second", "5s", "12 seconds", "about 10 sec", etc.
 */
export function parseDurationFromPrompt(prompt: string): number | null {
  const text = (prompt || "").toLowerCase();
  if (!text.trim()) return null;

  const patterns: RegExp[] = [
    /(\d{1,3})\s*[-–—]?\s*sec(?:ond)?s?\b/,
    /(\d{1,3})\s*s\b/,
    /\bfor\s+(\d{1,3})\s*sec/,
    /\b(\d{1,3})\s*second(?:s)?\s+(?:long|video|clip|ad|advertisement|scene)/,
    /\b(\d{1,3})\s*s\s+(?:video|clip|ad)/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0 && n <= 120) return n;
    }
  }
  return null;
}

export function supportedDurationsForTier(tier: StudioTier): readonly number[] {
  // Video never uses Ultra (premium internal). pro = Premium product mode.
  return tier === "standard" ? VIDEO_DURATIONS_STANDARD : VIDEO_DURATIONS_PREMIUM;
}

/**
 * Map a requested duration to the nearest supported option.
 * Prefer exact match; otherwise closest; prefer shorter on ties (lower cost).
 */
export function resolveVideoDuration(
  prompt: string,
  tier: StudioTier,
  complexityHint?: "simple" | "normal" | "complex",
): ParsedDuration {
  const allowed = supportedDurationsForTier(tier);
  const requested = parseDurationFromPrompt(prompt);

  if (requested != null) {
    if ((allowed as readonly number[]).includes(requested)) {
      return {
        requestedSec: requested,
        selectedSec: requested,
        exactMatch: true,
        note: null,
      };
    }
    // nearest, prefer lower cost on equal distance
    let best = allowed[0]!;
    let bestDist = Math.abs(best - requested);
    for (const d of allowed) {
      const dist = Math.abs(d - requested);
      if (dist < bestDist || (dist === bestDist && d < best)) {
        best = d;
        bestDist = dist;
      }
    }
    return {
      requestedSec: requested,
      selectedSec: best,
      exactMatch: false,
      note: `${requested}s is not available on this route. Closest supported duration is ${best}s.`,
    };
  }

  // No explicit duration — choose lowest suitable by complexity
  const complexity = complexityHint ?? estimatePromptComplexity(prompt);
  let selected = allowed[0]!;
  if (complexity === "complex" && allowed.includes(10 as never)) selected = 10;
  if (complexity === "complex" && tier !== "standard" && allowed.includes(15 as never)) {
    // still prefer 10 unless prompt strongly implies longer
    const longHints = /\b(long|extended|detailed|story|narrative|travel|journey)\b/i.test(prompt);
    selected = longHints ? 15 : 10;
  }

  return {
    requestedSec: null,
    selectedSec: selected,
    exactMatch: true,
    note: null,
  };
}

export function estimatePromptComplexity(prompt: string): "simple" | "normal" | "complex" {
  const t = (prompt || "").trim();
  if (t.length < 40) return "simple";
  const complexWords =
    /\b(cinematic|intricate|detailed|photorealistic|multi[- ]?shot|storyboard|volumetric|anamorphic|orchestration)\b/i.test(
      t,
    );
  if (complexWords || t.length > 220) return "complex";
  return "normal";
}

/** Image quality ladder used by Auto (maps to real backend quality ids). */
export type QualityStep = "standard" | "high" | "ultra";

export function qualityStepToImageQuality(
  step: QualityStep,
  tier: StudioTier,
): ImageQuality {
  if (step === "standard") return "sd";
  if (step === "high") return "hd";
  // ultra step only meaningful on Ultra AI tier
  if (tier === "premium") return "2k";
  if (tier === "pro") return "2k";
  return "hd";
}

/**
 * Auto quality: lowest suitable for the prompt + tier.
 * Never jumps to max cost by default.
 */
export function autoImageQuality(prompt: string, tier: StudioTier): {
  step: QualityStep;
  quality: ImageQuality;
  reason: string;
} {
  const complexity = estimatePromptComplexity(prompt);
  if (tier === "standard") {
    return {
      step: complexity === "complex" ? "high" : "standard",
      quality: complexity === "complex" ? "hd" : "sd",
      reason:
        complexity === "complex"
          ? "Higher detail requested — HD selected"
          : "Lowest suitable quality for this prompt",
    };
  }
  if (tier === "pro") {
    if (complexity === "complex") {
      return { step: "high", quality: "hd", reason: "Complex prompt — HD on Premium" };
    }
    return { step: "standard", quality: "sd", reason: "Lowest suitable quality on Premium" };
  }
  // Ultra AI
  if (complexity === "complex") {
    return { step: "high", quality: "hd", reason: "Complex prompt — HD on Ultra AI" };
  }
  return { step: "standard", quality: "sd", reason: "Lowest suitable quality on Ultra AI" };
}

/** Infer aspect from common prompt language. */
export function inferAspectFromPrompt(
  prompt: string,
  kind: StudioKind,
): string | null {
  const t = (prompt || "").toLowerCase();
  if (/\b(vertical|portrait|9:16|tiktok|reels?|shorts?)\b/.test(t)) return "9:16";
  if (/\b(square|1:1|instagram post)\b/.test(t)) return "1:1";
  if (/\b(widescreen|cinematic|16:9|landscape|youtube)\b/.test(t)) return "16:9";
  if (kind === "video") return null; // keep current default
  return null;
}

/**
 * Minimum plan that unlocks a studio tier experience.
 * Aligns with planLimits / policy — not invented.
 */
export function minPlanForStudioTier(tier: StudioTier): "free" | "lite" | "pro" | "studio" {
  if (tier === "standard") return "free";
  if (tier === "pro") return "pro"; // Premium experience
  return "studio"; // Ultra AI
}

export function upgradePathForTier(tier: StudioTier): string {
  const plan = minPlanForStudioTier(tier);
  return `/pricing?highlight=${plan}`;
}
