/**
 * MOTIO2EDIT Music Studio — customer-facing credit pricing.
 * Authoritative calculator: music-quote.ts (quoteMusicGeneration).
 * UI estimate and server deduction MUST use the same function.
 */

export type { MusicMode, MusicQualityTier } from "@/lib/music/music-plan-capabilities";
export {
  quoteMusicGeneration,
  estimateMusicCustomerCredits,
  MUSIC_PRICING_VERSION,
  type MusicQuoteInput,
  type MusicQuoteResult,
} from "@/lib/music/music-quote";

import { estimateMusicCustomerCredits } from "@/lib/music/music-quote";
import type { MusicMode, MusicQualityTier } from "@/lib/music/music-plan-capabilities";

/** User-facing matrix snapshot for docs / admin (standard tier, no image). */
export function musicCreditMatrixTable(): Array<{
  feature: string;
  s8: number;
  s15: number;
  s30: number;
}> {
  const row = (mode: MusicMode, hasVideo = false, quality: MusicQualityTier = "standard") => {
    const at = (d: number) =>
      estimateMusicCustomerCredits({
        mode,
        durationSeconds: d,
        hasVideo,
        characters: mode === "voiceover" ? 400 : undefined,
        qualityTier: quality,
        plan: quality === "premium" ? "pro" : "lite",
      }).credits;
    return { s8: at(8), s15: at(15), s30: at(30) };
  };
  return [
    { feature: "Song Standard", ...row("song") },
    { feature: "Song Premium", ...row("song", false, "premium") },
    { feature: "Instrumental Standard", ...row("instrumental") },
    { feature: "BGM Standard", ...row("bgm") },
    { feature: "BGM Premium", ...row("bgm", false, "premium") },
    { feature: "Voiceover (~400 chars)", ...row("voiceover") },
    { feature: "SFX", ...row("sfx") },
    { feature: "Video → Music", ...row("video_music", true) },
  ];
}
