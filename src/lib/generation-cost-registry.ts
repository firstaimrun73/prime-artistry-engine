/**
 * Central cost + credit registry for Motio2edit Video / Music (and related).
 *
 * Customer value (locked):
 *   400¢ ($4.00) = 350 credits  →  1 credit ≈ $0.01142857 customer value
 *
 * Provider costs are separate. Credits are computed so that after:
 *   provider + ops allowance (retry/storage/payment) + platform margin
 * the customer still pays a sustainable amount in Motio2edit credits.
 *
 * Do NOT hardcode provider prices in React components — update this file.
 *
 * Pricing notes were checked against fal.ai public pages (Aug 2026).
 * Re-verify before large pricing changes: https://fal.ai/pricing
 */

import type { PlanId } from "@/lib/plans";

/** Customer-value of one Motio2edit credit in USD. */
export const CREDIT_CUSTOMER_USD = 4 / 350; // ≈ 0.01142857

/**
 * Ops multiplier on provider cost (retry risk, storage, payment fees).
 * Applied before margin conversion.
 */
export const OPS_COST_MULTIPLIER = 1.15;

/**
 * Fraction of customer value reserved as Motio2edit gross contribution
 * after provider+ops. 0.72 means customer pays ~3.6× (ops-adjusted) provider.
 */
export const PLATFORM_GROSS_FRACTION = 0.72;

export type BillingUnit =
  | "per_generation"
  | "per_second"
  | "per_minute"
  | "per_1000_chars"
  | "per_image";

export type MediaCategory = "music" | "voiceover" | "sfx" | "video" | "image";

export type InputModality = "text" | "image" | "video" | "audio";

export type RegistryEntry = {
  id: string;
  /** fal.ai endpoint id */
  modelId: string;
  category: MediaCategory;
  operation: string;
  provider: string;
  billingUnit: BillingUnit;
  /** USD per billing unit (verified / last-checked) */
  providerUnitCostUsd: number;
  inputTypes: InputModality[];
  outputTypes: ("audio" | "video" | "image")[];
  /** Soft product limits */
  maxDurationSeconds?: number;
  minDurationSeconds?: number;
  minimumPlan: PlanId;
  /** Human notes */
  notes?: string;
  /** If true, UI may expose this model */
  enabled: boolean;
};

/**
 * Convert a known provider USD cost into Motio2edit credits.
 * credits = ceil( (provider * OPS) / (1 - PLATFORM_GROSS_FRACTION) / CREDIT_CUSTOMER_USD )
 */
export function creditsFromProviderUsd(providerUsd: number): number {
  if (!Number.isFinite(providerUsd) || providerUsd <= 0) return 1;
  const withOps = providerUsd * OPS_COST_MULTIPLIER;
  const customerValue = withOps / (1 - PLATFORM_GROSS_FRACTION);
  return Math.max(1, Math.ceil(customerValue / CREDIT_CUSTOMER_USD));
}

export function estimateProviderUsd(
  entry: RegistryEntry,
  opts: { durationSeconds?: number; characters?: number; units?: number } = {},
): number {
  const units = opts.units ?? 1;
  switch (entry.billingUnit) {
    case "per_generation":
    case "per_image":
      return entry.providerUnitCostUsd * units;
    case "per_second": {
      const sec = Math.max(1, opts.durationSeconds ?? entry.minDurationSeconds ?? 5);
      return entry.providerUnitCostUsd * sec;
    }
    case "per_minute": {
      const sec = Math.max(1, opts.durationSeconds ?? 60);
      const minutes = Math.ceil(sec / 60);
      return entry.providerUnitCostUsd * minutes;
    }
    case "per_1000_chars": {
      const chars = Math.max(1, opts.characters ?? 1000);
      return entry.providerUnitCostUsd * (chars / 1000);
    }
    default:
      return entry.providerUnitCostUsd;
  }
}

export function estimateCredits(
  entry: RegistryEntry,
  opts: { durationSeconds?: number; characters?: number; units?: number } = {},
): { providerUsd: number; credits: number; customerValueUsd: number } {
  const providerUsd = estimateProviderUsd(entry, opts);
  const credits = creditsFromProviderUsd(providerUsd);
  return {
    providerUsd,
    credits,
    customerValueUsd: credits * CREDIT_CUSTOMER_USD,
  };
}

/**
 * Verified / documented provider endpoints (Aug 2026 fal catalog).
 * Image Studio / Auto Edit keep their existing fixed credit costs elsewhere.
 */
export const GENERATION_REGISTRY: RegistryEntry[] = [
  // ── Music ──────────────────────────────────────────────────────────────
  {
    id: "music_minimax_v2",
    modelId: "fal-ai/minimax-music/v2",
    category: "music",
    operation: "song_or_instrumental",
    provider: "MiniMax via fal",
    billingUnit: "per_generation",
    providerUnitCostUsd: 0.03,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    minimumPlan: "lite",
    notes: "Style prompt + lyrics_prompt. ~$0.03/generation on fal.",
    enabled: true,
  },
  {
    id: "music_minimax_v26",
    modelId: "fal-ai/minimax-music/v2.6",
    category: "music",
    operation: "song_or_instrumental",
    provider: "MiniMax via fal",
    billingUnit: "per_generation",
    providerUnitCostUsd: 0.15,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    minimumPlan: "plus",
    notes: "Higher quality MiniMax 2.6; ~$0.15/audio on fal.",
    enabled: true,
  },
  {
    id: "music_stable_audio",
    modelId: "fal-ai/stable-audio",
    category: "music",
    operation: "instrumental",
    provider: "Stability via fal",
    billingUnit: "per_generation",
    providerUnitCostUsd: 0.2,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    maxDurationSeconds: 180,
    minimumPlan: "lite",
    notes: "Instrumental / soundscape oriented; ~$0.20/gen (Stable Audio 2.5 class).",
    enabled: true,
  },
  {
    id: "music_elevenlabs",
    modelId: "fal-ai/elevenlabs/music",
    category: "music",
    operation: "song",
    provider: "ElevenLabs via fal",
    billingUnit: "per_minute",
    providerUnitCostUsd: 0.8,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    minimumPlan: "pro",
    notes: "~$0.80 per output minute, rounded up. Premium only.",
    enabled: false, // enable after product sign-off on cost
  },

  // ── Video-aware audio / SFX ────────────────────────────────────────────
  {
    id: "sfx_mmaudio_v2",
    modelId: "fal-ai/mmaudio-v2",
    category: "sfx",
    operation: "video_synced_audio",
    provider: "MMAudio via fal",
    billingUnit: "per_second",
    providerUnitCostUsd: 0.001,
    inputTypes: ["video", "text"],
    outputTypes: ["video", "audio"],
    maxDurationSeconds: 30,
    minDurationSeconds: 1,
    minimumPlan: "lite",
    notes: "Synced audio from video±text; $0.001/s. Real video→music path.",
    enabled: true,
  },
  {
    id: "sfx_mmaudio_text",
    modelId: "fal-ai/mmaudio-v2/text-to-audio",
    category: "sfx",
    operation: "text_to_sfx",
    provider: "MMAudio via fal",
    billingUnit: "per_second",
    providerUnitCostUsd: 0.001,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    maxDurationSeconds: 30,
    minimumPlan: "lite",
    notes: "Text-only SFX / ambient; $0.001/s.",
    enabled: true,
  },

  // ── Voiceover / TTS (placeholder rates — re-verify before enable) ──────
  {
    id: "tts_xai",
    modelId: "fal-ai/xai/tts",
    category: "voiceover",
    operation: "tts",
    provider: "xAI via fal",
    billingUnit: "per_1000_chars",
    providerUnitCostUsd: 0.015,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    minimumPlan: "lite",
    notes: "~$0.015 / 1k characters (verify current fal page before go-live).",
    enabled: false,
  },

  // ── Video generation (illustrative; align with existing generate.functions) ─
  {
    id: "video_kling_t2v_std",
    modelId: "fal-ai/kling-video/v1.6/standard/text-to-video",
    category: "video",
    operation: "text_to_video",
    provider: "Kling via fal",
    billingUnit: "per_second",
    providerUnitCostUsd: 0.05,
    inputTypes: ["text"],
    outputTypes: ["video"],
    maxDurationSeconds: 30,
    minDurationSeconds: 5,
    minimumPlan: "lite",
    notes: "Align with live fal-request TEXT_TO_VIDEO models; rate approx.",
    enabled: true,
  },
  {
    id: "video_kling_i2v_std",
    modelId: "fal-ai/kling-video/v1.6/standard/image-to-video",
    category: "video",
    operation: "image_to_video",
    provider: "Kling via fal",
    billingUnit: "per_second",
    providerUnitCostUsd: 0.05,
    inputTypes: ["image", "text"],
    outputTypes: ["video"],
    maxDurationSeconds: 30,
    minDurationSeconds: 5,
    minimumPlan: "lite",
    enabled: true,
  },
  {
    id: "video_v2v_mmaudio",
    modelId: "fal-ai/mmaudio-v2",
    category: "video",
    operation: "video_to_audio_track",
    provider: "MMAudio via fal",
    billingUnit: "per_second",
    providerUnitCostUsd: 0.001,
    inputTypes: ["video", "text"],
    outputTypes: ["video"],
    minimumPlan: "lite",
    notes: "Not full visual V2V edit — adds/syncs audio to existing video.",
    enabled: true,
  },
];

export function getRegistryEntry(id: string): RegistryEntry | undefined {
  return GENERATION_REGISTRY.find((e) => e.id === id);
}

export function getEnabledByCategory(category: MediaCategory): RegistryEntry[] {
  return GENERATION_REGISTRY.filter((e) => e.category === category && e.enabled);
}

/** Plan rank for gating (higher = more access). */
const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  lite: 1,
  plus: 2,
  pro: 3,
  studio: 4,
  business: 5,
};

export function planMeetsMinimum(userPlan: PlanId, minimum: PlanId): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[minimum];
}

/** Profitability snapshot for ops (not shown as absolute guarantee to end users). */
export function profitabilityRow(
  entry: RegistryEntry,
  opts: { durationSeconds?: number; characters?: number } = {},
) {
  const est = estimateCredits(entry, opts);
  const gross = est.customerValueUsd - est.providerUsd;
  return {
    id: entry.id,
    modelId: entry.modelId,
    providerUsd: Number(est.providerUsd.toFixed(4)),
    credits: est.credits,
    customerValueUsd: Number(est.customerValueUsd.toFixed(4)),
    grossSpreadUsd: Number(gross.toFixed(4)),
  };
}
