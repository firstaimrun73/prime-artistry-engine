/**
 * B3 — server-side access validation for Video Studio (studioVersion: 2).
 * Never trust the client. Pure checks + message codes matching studio-contract.
 */

import {
  type VideoMode,
  type VideoQuality,
  type VideoAspect,
  type StyleTier,
  videoAccess,
  quoteVideo,
  parseTimeTags,
  VIDEO_PROMPT_MAX,
  VIDEO_V2V_MAX_INPUT_SEC,
  type StartVideoInput,
  type StartVideoResult,
} from "@/lib/video/studio-contract";

export type ValidateStartInput = StartVideoInput & {
  plan: string;
  isAdmin: boolean;
  /** Optional: style tier resolved from styleId registry on server */
  styleTier?: StyleTier;
};

/**
 * Reject locked features before any provider call.
 * Returns ok:false with the contract error codes.
 */
export function validateStartVideoInput(
  input: ValidateStartInput,
): StartVideoResult | { ok: true; credits: number; etaSeconds: number; routeId: string } {
  const access = videoAccess(input.plan, input.isAdmin);

  if (!input.prompt?.trim() && input.mode === "text") {
    return {
      ok: false,
      code: "invalid_input",
      message: "Prompt is required for text-to-video.",
    };
  }
  if (input.prompt && input.prompt.length > VIDEO_PROMPT_MAX) {
    return {
      ok: false,
      code: "invalid_input",
      message: `Prompt exceeds ${VIDEO_PROMPT_MAX} characters.`,
    };
  }

  if (input.durationSec > access.maxDurationSec) {
    return {
      ok: false,
      code: "locked_duration",
      message: `Your plan allows up to ${access.maxDurationSec}s. Upgrade to unlock longer videos.`,
    };
  }

  if (!access.resolutions.includes(input.quality)) {
    return {
      ok: false,
      code: "locked_quality",
      message: `${input.quality} is not available on your plan.`,
    };
  }

  if (!input.watermark && !access.canDisableWatermark) {
    return {
      ok: false,
      code: "locked_watermark",
      message: "Watermark can be turned off on Lite and above.",
    };
  }

  if (input.styleTier && !access.styleTiers.includes(input.styleTier)) {
    return {
      ok: false,
      code: "locked_style",
      message: "This style requires a higher plan.",
    };
  }

  if (input.mode === "video") {
    const sec = input.inputSec ?? 0;
    if (sec < 1 || sec > VIDEO_V2V_MAX_INPUT_SEC) {
      return {
        ok: false,
        code: "invalid_input",
        message: `Video input must be 1–${VIDEO_V2V_MAX_INPUT_SEC} seconds.`,
      };
    }
  }

  if (input.mode === "image" && !input.imageUrl) {
    return {
      ok: false,
      code: "invalid_input",
      message: "An image is required for image-to-video.",
    };
  }
  if (input.mode === "video" && !input.videoUrl) {
    return {
      ok: false,
      code: "invalid_input",
      message: "A video is required for video-to-video.",
    };
  }

  const tags = parseTimeTags(input.prompt || "", input.durationSec);
  if (!tags.ok) {
    return {
      ok: false,
      code: "invalid_time_tags",
      message: tags.error || "Invalid time tags in prompt.",
    };
  }

  const q = quoteVideo({
    mode: input.mode,
    aspect: input.aspect,
    quality: input.quality,
    durationSec: input.durationSec,
    sound: input.sound,
    inputSec: input.inputSec,
  });
  if (!q) {
    return {
      ok: false,
      code: "no_route",
      message: "No model supports this combination of mode, quality, and duration.",
    };
  }

  return {
    ok: true,
    credits: q.credits,
    etaSeconds: q.etaSeconds,
    routeId: q.routeId,
  };
}
