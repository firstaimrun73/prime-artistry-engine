/**
 * Permanent voice-preview assets on Cloudflare R2 / public CDN.
 * When a URL is set, getVoicePreview serves it directly (no credit, no xAI call).
 * Leave empty string to fall back to generate-once + cache.
 */
export const XAI_VOICES = ["eve", "ara", "rex", "sal", "leo"] as const;
export type XaiVoiceId = (typeof XAI_VOICES)[number];

/**
 * Public HTTPS URLs only (assets.motio2edit.com or equivalent).
 * Populate after uploading pre-rendered previews to R2.
 */
export const VOICE_PREVIEW_ASSETS: Record<XaiVoiceId, string> = {
  eve: process.env.VOICE_PREVIEW_EVE_URL?.trim() || "",
  ara: process.env.VOICE_PREVIEW_ARA_URL?.trim() || "",
  rex: process.env.VOICE_PREVIEW_REX_URL?.trim() || "",
  sal: process.env.VOICE_PREVIEW_SAL_URL?.trim() || "",
  leo: process.env.VOICE_PREVIEW_LEO_URL?.trim() || "",
};

export const PREVIEW_LINES: Record<XaiVoiceId, string> = {
  eve: "Hi, I'm Eve — clear, energetic, and ready for your story.",
  ara: "Hello, I'm Ara. Warm, friendly, and easy to listen to.",
  rex: "I'm Rex. Confident, clear, and built for strong narration.",
  sal: "Hey, I'm Sal — smooth, balanced, and conversational.",
  leo: "This is Leo. Authoritative, strong, and made to lead.",
};

export function normalizeVoice(raw?: string | null): XaiVoiceId {
  const v = (raw || "eve").toLowerCase().trim();
  return (XAI_VOICES as readonly string[]).includes(v) ? (v as XaiVoiceId) : "eve";
}

export function getConfiguredVoicePreviewUrl(voice: XaiVoiceId): string | null {
  const u = VOICE_PREVIEW_ASSETS[voice]?.trim();
  if (u && u.startsWith("https://")) return u;
  return null;
}
