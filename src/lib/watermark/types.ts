/** Independent Motio2edit watermark subsystem — shared types. */
export type WatermarkMode = "none" | "primary" | "primary+secondary";
export type MediaKind = "image" | "video";

/** Internal Experience ids (Image Studio). Client may request; server validates. */
export type WatermarkStudioTier = "standard" | "pro" | "premium";

/** Brand variant: generic Motio2edit vs Circle 2edit purple ring. */
export type WatermarkBrand = "generic" | "circle";

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
  /** Circle 2edit uses purple-ring brand; default generic. */
  watermarkBrand?: WatermarkBrand;
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
