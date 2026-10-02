/**
 * Permanent voice-preview assets on Cloudflare R2 / public CDN.
 * getVoicePreview and MusicVoiceLibrary must use these URLs only —
 * never call xAI / fal for sample playback.
 */
export const XAI_VOICES = ["eve", "ara", "rex", "sal", "leo"] as const;
export type XaiVoiceId = (typeof XAI_VOICES)[number];

const MEDIA6 = "https://assets.motio2edit.com/samples/media_6";

/**
 * Public HTTPS URLs for pre-rendered AI Voice samples (no generation).
 * Leo filename includes a space before .mp3 on R2 — encoded below.
 */
export const VOICE_PREVIEW_ASSETS: Record<XaiVoiceId, string> = {
  eve: `${MEDIA6}/Eve-Aivoice-sample_music-studio.mp3`,
  ara: `${MEDIA6}/Ara-Aivoice-sample_music-studio.mp3`,
  rex: `${MEDIA6}/Rex-Aivoice-sample_music-studio.mp3`,
  sal: `${MEDIA6}/Sal-Aivoice-sample_music-studio.mp3`,
  leo: `${MEDIA6}/${encodeURIComponent("Leo-Aivoice-sample_music-studio .mp3")}`,
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
