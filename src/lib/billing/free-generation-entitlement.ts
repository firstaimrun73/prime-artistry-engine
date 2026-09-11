/**
 * Server-side free generation entitlements.
 *
 * Free ≠ free for Motio2edit: provider COGS are still recorded.
 * Client cannot grant free generations. One-time use is enforced server-side.
 *
 * Storage: generation_history rows with metadata.free_generation = true
 * (no schema migration required). Atomic claim via insert-before-provider
 * race is imperfect without unique constraint; we also check existing rows.
 *
 * FINAL ECONOMICS / WELCOME POLICY PENDING PRODUCT REVIEW.
 */

export type FreeGenerationProduct = "video" | "image" | "music" | "lens";

export type FreeGenerationPolicy = {
  product: FreeGenerationProduct;
  /** Stable entitlement key, e.g. welcome_video_v1 */
  entitlementKey: string;
  /** Friendly UI label */
  label: string;
  /**
   * Allowed configuration for this free entitlement.
   * Server rejects free claim if request falls outside.
   */
  allowed: {
    mode?: "text" | "image" | "video";
    maxDurationSec?: number;
    maxResolution?: "480p" | "720p" | "1080p";
    audio?: boolean;
    productMode?: "standard" | "premium";
  };
};

/** Welcome free video: economical Text→Video 5s 480p silent Standard. */
export const WELCOME_FREE_VIDEO: FreeGenerationPolicy = {
  product: "video",
  entitlementKey: "welcome_video_v1",
  label: "1 free video",
  allowed: {
    mode: "text",
    maxDurationSec: 5,
    maxResolution: "480p",
    audio: false,
    productMode: "standard",
  },
};

const RES_RANK: Record<string, number> = {
  "480p": 1,
  "720p": 2,
  "1080p": 3,
  "2k": 4,
};

export type EvaluateFreeVideoInput = {
  userId: string;
  isAdmin?: boolean;
  mode: "text" | "image" | "video";
  durationSec: number;
  resolution: string;
  audio: boolean;
  productMode: "standard" | "premium";
};

export type EvaluateFreeVideoResult = {
  eligible: boolean;
  policy: FreeGenerationPolicy | null;
  reason?: string;
};

/**
 * Server-only eligibility check for welcome free video.
 * Does not mutate state; claim happens when generation_history is written.
 */
export async function evaluateWelcomeFreeVideo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  input: EvaluateFreeVideoInput,
): Promise<EvaluateFreeVideoResult> {
  const policy = WELCOME_FREE_VIDEO;

  if (input.isAdmin) {
    // Admins are never blocked by free quota; still report not "free" so normal path runs.
    return { eligible: false, policy: null, reason: "admin" };
  }

  const a = policy.allowed;
  if (a.mode && input.mode !== a.mode) {
    return { eligible: false, policy: null, reason: "mode" };
  }
  if (a.productMode && input.productMode !== a.productMode) {
    return { eligible: false, policy: null, reason: "productMode" };
  }
  if (a.maxDurationSec != null && input.durationSec > a.maxDurationSec) {
    return { eligible: false, policy: null, reason: "duration" };
  }
  if (a.audio === false && input.audio) {
    return { eligible: false, policy: null, reason: "audio" };
  }
  if (a.maxResolution) {
    const need = RES_RANK[a.maxResolution] ?? 99;
    const got = RES_RANK[input.resolution] ?? 99;
    if (got > need) {
      return { eligible: false, policy: null, reason: "resolution" };
    }
  }

  // Already used?
  try {
    const { data, error } = await supabaseAdmin
      .from("generation_history")
      .select("id")
      .eq("user_id", input.userId)
      .eq("type", "video")
      .contains("metadata", { free_generation: true, entitlement_key: policy.entitlementKey })
      .limit(1);

    if (error) {
      // Fallback: any free_generation video for this user
      const { data: data2 } = await supabaseAdmin
        .from("generation_history")
        .select("id")
        .eq("user_id", input.userId)
        .eq("type", "video")
        .contains("metadata", { free_generation: true })
        .limit(1);
      if (data2 && data2.length > 0) {
        return { eligible: false, policy: null, reason: "already_used" };
      }
    } else if (data && data.length > 0) {
      return { eligible: false, policy: null, reason: "already_used" };
    }
  } catch {
    return { eligible: false, policy: null, reason: "lookup_error" };
  }

  return { eligible: true, policy };
}
