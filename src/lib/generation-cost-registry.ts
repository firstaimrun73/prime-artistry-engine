/**
 * Central cost + credit registry for Motio2edit Video / Music (and related).
 * Restored for build — estimateCredits + getRegistryEntry required by music-quote.
 */

export type BillingUnit = "per_second" | "per_character" | "flat" | "per_request";

export type RegistryEntry = {
  id: string;
  provider: string;
  modelId: string;
  enabled: boolean;
  billingUnit: BillingUnit;
  /** Provider cost in USD for the billing unit base. */
  providerUsd: number;
  /** Customer credits charged for the billing unit base. */
  credits: number;
  /** Optional floor credits. */
  minCredits?: number;
  /** Optional max duration seconds for duration-based models. */
  maxSeconds?: number;
  minimumPlan?: string;
  label?: string;
};

const REGISTRY: RegistryEntry[] = [
  {
    id: "music_minimax_v2",
    provider: "fal",
    modelId: "fal-ai/minimax-music/v2",
    enabled: true,
    billingUnit: "flat",
    providerUsd: 0.03,
    credits: 50,
    minCredits: 50,
    maxSeconds: 120,
    label: "Standard Music",
  },
  {
    id: "music_minimax_v26",
    provider: "fal",
    modelId: "fal-ai/minimax-music/v2.6",
    enabled: true,
    billingUnit: "flat",
    providerUsd: 0.05,
    credits: 100,
    minCredits: 100,
    maxSeconds: 120,
    minimumPlan: "pro",
    label: "Premium Music",
  },
  {
    id: "sfx_mmaudio_v2",
    provider: "fal",
    modelId: "fal-ai/mmaudio-v2",
    enabled: true,
    billingUnit: "per_second",
    providerUsd: 0.001,
    credits: 2,
    minCredits: 25,
    maxSeconds: 30,
    label: "Video Soundtrack",
  },
  {
    id: "sfx_mmaudio_text",
    provider: "fal",
    modelId: "fal-ai/mmaudio-v2/text-to-audio",
    enabled: true,
    billingUnit: "per_second",
    providerUsd: 0.001,
    credits: 2,
    minCredits: 25,
    maxSeconds: 30,
    label: "Sound Effects",
  },
  {
    id: "tts_xai",
    provider: "xai",
    modelId: "xai/tts",
    enabled: true,
    billingUnit: "per_character",
    providerUsd: 0.00002,
    credits: 0.05,
    minCredits: 30,
    label: "Voiceover",
  },
];

export function getRegistryEntry(id: string): RegistryEntry | undefined {
  return REGISTRY.find((e) => e.id === id);
}

export function listRegistryEntries(): RegistryEntry[] {
  return REGISTRY.slice();
}

/**
 * Estimate customer credits from a registry entry and usage dims.
 */
export function estimateCredits(
  entry: RegistryEntry,
  opts?: { durationSeconds?: number; characters?: number },
): { credits: number; providerUsd: number } {
  const duration = Math.max(0, opts?.durationSeconds ?? 0);
  const characters = Math.max(0, opts?.characters ?? 0);

  let providerUsd = entry.providerUsd;
  let credits = entry.credits;

  if (entry.billingUnit === "per_second") {
    const secs = Math.max(1, duration);
    providerUsd = entry.providerUsd * secs;
    credits = entry.credits * secs;
  } else if (entry.billingUnit === "per_character") {
    const chars = Math.max(1, characters);
    providerUsd = entry.providerUsd * chars;
    credits = entry.credits * chars;
  } else {
    // flat / per_request
    providerUsd = entry.providerUsd;
    credits = entry.credits;
  }

  if (entry.minCredits != null) {
    credits = Math.max(entry.minCredits, credits);
  }

  return {
    credits: Math.max(1, Math.ceil(credits)),
    providerUsd: Number(providerUsd.toFixed(6)),
  };
}
