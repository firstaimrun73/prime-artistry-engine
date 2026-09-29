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
 * Pricing notes checked against fal.ai public pages. Re-verify before large changes.
 */

import type { PlanId } from "@/lib/plans";

/** Customer-value of one Motio2edit credit in USD. */
export const CREDIT_CUSTOMER_USD = 4 / 350; // ≈ 0.01142857

export const OPS_COST_MULTIPLIER = 1.15;

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
  modelId: string;
  category: MediaCategory;
  operation: string;
  provider: string;
  billingUnit: BillingUnit;
  providerUnitCostUsd: number;
  inputTypes: InputModality[];
  outputTypes: ("audio" | "video" | "image")[];
  maxDurationSeconds?: number;
  minDurationSeconds?: number;
  minimumPlan: PlanId;
  notes?: string;
  enabled: boolean;
};

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
 * Active production providers for Music Studio.
 * Standard Song/Instrumental/BGM: MiniMax 2.0 $0.03/gen
 * Premium Song/Instrumental/BGM: MiniMax 2.6 $0.15/audio (Pro+)
 * Voiceover: xAI TTS $0.015/1k chars
 * SFX: MMAudio text-to-audio $0.001/s (max 30s)
 * Video→Music: MMAudio V2 $0.001/s (max 30s segment)
 */
export const GENERATION_REGISTRY: RegistryEntry[] = [
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
    notes: "Standard Song/Instrumental/BGM. ~$0.03/generation.",
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
    minimumPlan: "pro",
    notes: "Premium Song/Instrumental/BGM. ~$0.15/audio. Pro+ only.",
    enabled: true,
  },
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
    notes: "Video→Music. $0.001/s. Provider max 30s per segment. Do not silently truncate longer jobs.",
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
    minDurationSeconds: 1,
    minimumPlan: "lite",
    notes: "Text SFX. $0.001/s. Max 30s.",
    enabled: true,
  },
  {
    id: "tts_xai",
    modelId: "xai/tts/v1",
    category: "voiceover",
    operation: "tts",
    provider: "xAI via fal",
    billingUnit: "per_1000_chars",
    providerUnitCostUsd: 0.015,
    inputTypes: ["text"],
    outputTypes: ["audio"],
    minimumPlan: "lite",
    notes: "xai/tts/v1 — $0.015 / 1k characters. Voices: eve, ara, rex, sal, leo. Same model for all plans.",
    enabled: true,
  },
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
];

export function getRegistryEntry(id: string): RegistryEntry | undefined {
  return GENERATION_REGISTRY.find((e) => e.id === id);
}

export function getEnabledByCategory(category: MediaCategory): RegistryEntry[] {
  return GENERATION_REGISTRY.filter((e) => e.category === category && e.enabled);
}

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
