/** Independent Motio2edit watermark subsystem — shared types. */
export type WatermarkMode = "none" | "primary" | "primary+secondary";
export type MediaKind = "image" | "video";

/** Internal Experience ids (Image Studio). Client may request; server validates. */
export type WatermarkStudioTier = "standard" | "pro" | "premium";

export type WatermarkPolicy = {
  mode: WatermarkMode;
  primary: boolean;
  secondary: boolean;
  alreadyFinalized: boolean;
  reason: string;
};

export type FinalizeMediaInput = {
  sourceUrl?: string;
  sourceBuffer?: Buffer;
  mediaKind: MediaKind;
  plan: string | null | undefined;
  email?: string | null | undefined;
  isAdmin?: boolean;
  keepWatermark?: boolean;
  userId: string;
  alreadyFinalizedHint?: boolean;
  /**
   * Image Studio Experience (internal id).
   * Server maps to user-facing watermark label; never trusts client-supplied free text.
   */
  studioTier?: WatermarkStudioTier;
};

export type FinalizeMediaResult = {
  finalUrl: string;
  watermarked: boolean;
  mode: WatermarkMode;
  storagePath?: string;
  skippedAsFinalized: boolean;
  timings?: { fetchMs?: number; renderMs?: number; storeMs?: number; totalMs: number };
};

export const FINALIZED_PATH_MARKER = "out-wm-";
export const FINALIZED_VIDEO_MARKER = "out-wm-vid-";
