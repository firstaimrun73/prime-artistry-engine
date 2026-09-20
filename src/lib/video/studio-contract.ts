/**
 * Video Studio contract — THE ONLY module the Video Studio UI should import for logic.
 * B1: exact types + working stubs. Real logic lands in B2–B8 behind these signatures.
 * Do not change export names or signatures.
 */

import { quoteVideoCredits } from "@/lib/video/video-routes";
import { maxVideoDurationForPlan, planRequiredForDuration } from "@/lib/video-options";
import type { PlanId } from "@/lib/plans";
import { parsePromptTiming } from "@/lib/video/prompt-timing";

// ---- constants (PDF contract)
export type VideoMode = "text" | "image" | "video";
export type VideoQuality = "sd" | "720p" | "1080p";
export type VideoAspect = "16:9" | "9:16" | "1:1";
export type StyleTier = "common" | "ai_plus" | "premium";

export const VIDEO_PROMPT_MAX = 3000;
export const VIDEO_V2V_MAX_INPUT_SEC = 10;
export const VIDEO_MIN_CREDITS = 50;

// ---- quotes (pure, shared by UI and server)
export type QuoteInput = {
  mode: VideoMode;
  aspect: VideoAspect;
  quality: VideoQuality;
  durationSec: 5 | 10 | 15;
  sound: boolean;
  inputSec?: number;
};

export type Quote = { credits: number; routeId: string; etaSeconds: number } | null;

export type QuoteCell = { silent: number | null; sound: number | null };
export type QuoteTable = {
  rows: {
    durationSec: number;
    label: string;
    cells: Record<VideoQuality, QuoteCell>;
  }[];
};

function qualityToResolution(q: VideoQuality): "480p" | "720p" | "1080p" {
  if (q === "sd") return "480p";
  return q;
}

/** ETA defaults until measured medians (B2 catalog). */
const ETA_BY_ROUTE: Record<string, number> = {
  "ltx-2-3-fast": 60,
  "wan-2-5": 90,
  "grok-imagine": 90,
  "kling-2-5-turbo": 120,
  "ltx23-v2v": 120,
  default: 90,
};

/**
 * Shared quote for UI estimate and server reserve.
 * Wraps existing quoteVideoCredits (B2 will align catalog + golden table).
 */
export function quoteVideo(i: QuoteInput): Quote {
  const durationSec =
    i.mode === "video" && i.inputSec != null && i.inputSec > 0
      ? Math.min(VIDEO_V2V_MAX_INPUT_SEC, Math.max(1, Math.ceil(i.inputSec)))
      : i.durationSec;

  const r = quoteVideoCredits({
    mode: i.mode,
    durationSec,
    resolution: qualityToResolution(i.quality),
    aspect: i.aspect,
    audio: i.sound,
  });
  if (!r.ok) return null;
  const eta =
    ETA_BY_ROUTE[r.quote.routeId] ??
    ETA_BY_ROUTE[r.quote.modelId] ??
    ETA_BY_ROUTE.default;
  return {
    credits: r.quote.credits,
    routeId: r.quote.routeId,
    etaSeconds: eta,
  };
}

/**
 * Credit matrix for the (i) sheet. Video mode: one row from real input length.
 */
export function quoteTable(
  mode: VideoMode,
  aspect: VideoAspect,
  inputSec?: number,
): QuoteTable {
  const qualities: VideoQuality[] = ["sd", "720p", "1080p"];
  if (mode === "video") {
    const sec =
      inputSec != null && inputSec > 0
        ? Math.min(VIDEO_V2V_MAX_INPUT_SEC, Math.max(1, Math.ceil(inputSec)))
        : 5;
    const cells = {} as Record<VideoQuality, QuoteCell>;
    for (const q of qualities) {
      const silent = quoteVideo({
        mode: "video",
        aspect,
        quality: q,
        durationSec: 5,
        sound: false,
        inputSec: sec,
      });
      cells[q] = {
        silent: silent?.credits ?? null,
        sound: null,
      };
    }
    return {
      rows: [{ durationSec: sec, label: `${sec}s (input)`, cells }],
    };
  }

  const durations = [5, 10, 15] as const;
  const rows = durations.map((durationSec) => {
    const cells = {} as Record<VideoQuality, QuoteCell>;
    for (const q of qualities) {
      const silent = quoteVideo({
        mode,
        aspect,
        quality: q,
        durationSec,
        sound: false,
      });
      const sound = quoteVideo({
        mode,
        aspect,
        quality: q,
        durationSec,
        sound: true,
      });
      cells[q] = {
        silent: silent?.credits ?? null,
        sound: sound?.credits ?? null,
      };
    }
    return {
      durationSec,
      label: `${durationSec}s`,
      cells,
    };
  });
  return { rows };
}

// ---- access (pure)
export type VideoAccess = {
  plan: string;
  isAdmin: boolean;
  maxDurationSec: number;
  resolutions: VideoQuality[];
  styleTiers: StyleTier[];
  canDisableWatermark: boolean;
};

/**
 * Temporary mapping from PDF section 5 + existing PLAN_MAX_VIDEO_DURATION.
 * B3 will harden server enforcement.
 */
export function videoAccess(plan: string, isAdmin: boolean): VideoAccess {
  const p = (plan || "free").toLowerCase();
  const maxDurationSec = isAdmin ? 15 : maxVideoDurationForPlan(p as PlanId);

  const resolutions: VideoQuality[] = isAdmin
    ? ["sd", "720p", "1080p"]
    : p === "free"
      ? ["sd", "720p"]
      : ["sd", "720p", "1080p"];

  let styleTiers: StyleTier[] = ["common"];
  if (isAdmin || p === "plus" || p === "pro" || p === "studio" || p === "ultra") {
    styleTiers = ["common", "ai_plus", "premium"];
  } else if (p === "lite" || p === "starter") {
    styleTiers = ["common"];
  }

  const canDisableWatermark = isAdmin || (p !== "free" && p !== "");

  return {
    plan: p,
    isAdmin,
    maxDurationSec,
    resolutions,
    styleTiers,
    canDisableWatermark,
  };
}

export function unlockPlanFor(feature: {
  duration?: number;
  quality?: VideoQuality;
  tier?: StyleTier;
  noWatermark?: boolean;
}): string {
  if (feature.noWatermark) return "Lite";
  if (feature.tier === "premium") return "Pro";
  if (feature.tier === "ai_plus") return "Plus";
  if (feature.quality === "1080p") return "Lite";
  if (feature.duration != null) {
    return planRequiredForDuration(feature.duration) || "Plus";
  }
  return "Lite";
}

// ---- time tags (pure) — B5 expands; stub wraps existing parser
export type TimeSegment = { start: number; end: number; text: string };

export function parseTimeTags(
  prompt: string,
  durationSec: number,
): {
  ok: boolean;
  hasTags: boolean;
  segments: TimeSegment[];
  general: string;
  error?: string;
} {
  const parsed = parsePromptTiming(prompt);
  if (parsed.errors.length > 0) {
    return {
      ok: false,
      hasTags: parsed.cues.length > 0,
      segments: [],
      general: parsed.cleanPrompt,
      error: parsed.errors[0],
    };
  }
  const segments: TimeSegment[] = parsed.cues.map((c) => ({
    start: c.startSec,
    end: c.endSec === c.startSec ? Math.min(durationSec, c.startSec + 1) : c.endSec,
    text: "",
  }));
  for (const s of segments) {
    if (s.end > durationSec) {
      return {
        ok: false,
        hasTags: true,
        segments: [],
        general: parsed.cleanPrompt,
        error: `Segment ends after video duration (${durationSec}s).`,
      };
    }
  }
  return {
    ok: true,
    hasTags: segments.length > 0,
    segments,
    general: parsed.cleanPrompt,
  };
}

// ---- sources (client helper — wraps existing upload path)
export async function uploadVideoSource(
  _file: File,
  _kind: "image" | "video",
): Promise<{ url: string }> {
  throw new Error(
    "uploadVideoSource is not wired yet — use the existing Video Studio upload path (B3).",
  );
}

// ---- jobs (server functions — stubs until B6)
export type StartVideoInput = {
  mode: VideoMode;
  prompt: string;
  styleId: string;
  aspect: VideoAspect;
  quality: VideoQuality;
  durationSec: 5 | 10 | 15;
  sound: boolean;
  watermark: boolean;
  imageUrl?: string;
  videoUrl?: string;
  inputSec?: number;
  studioVersion: 2;
};

export type StartVideoResult =
  | { ok: true; jobId: string; credits: number; etaSeconds: number }
  | {
      ok: false;
      code:
        | "insufficient_credits"
        | "locked_style"
        | "locked_duration"
        | "locked_quality"
        | "locked_watermark"
        | "invalid_input"
        | "invalid_time_tags"
        | "no_route"
        | "busy"
        | "server";
      message: string;
    };

export async function startVideoJob(
  _input: StartVideoInput,
): Promise<StartVideoResult> {
  return {
    ok: false,
    code: "server",
    message: "startVideoJob not implemented yet (B6 background jobs).",
  };
}

export type VideoJob = {
  jobId: string;
  status: "queued" | "running" | "done" | "failed";
  createdAt: number;
  etaSeconds: number;
  credits: number;
  mode: VideoMode;
  aspect: VideoAspect;
  quality: VideoQuality;
  durationSec: number;
  styleId: string;
  outputUrl?: string;
  posterUrl?: string;
  watermarkApplied?: boolean;
  error?: string;
  refunded?: boolean;
};

export async function getVideoJob(_jobId: string): Promise<VideoJob | null> {
  return null;
}

export async function listActiveVideoJobs(): Promise<VideoJob[]> {
  return [];
}
