export const PRODUCT_VIDEO_DURATIONS = [5, 10] as const;
// TEMPORARY STUB — full file restore required
export type VideoGenMode = "text" | "image" | "video";
export type VideoModelTierSection = "standard" | "premium";
export type VideoTier = VideoModelTierSection;
export type VideoResolution = "480p" | "720p" | "1080p" | "2k" | "4k";
export type VideoAspect = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
export const USER_MAX_DURATION_SEC = 60;
export const MIN_VIDEO_CREDITS = 125;
export const MIN_VIDEO_TO_VIDEO_CREDITS = 180;
export const MAX_4K_DURATION_SEC = 10;
export function is4kDurationLocked(durationSec: number, resolution: VideoResolution): boolean {
  return resolution === "4k" && durationSec > MAX_4K_DURATION_SEC;
}
export function resolutionUiLabel(r: VideoResolution): string {
  if (r === "4k") return "4K";
  if (r === "2k") return "2K";
  if (r === "1080p") return "HD";
  if (r === "720p") return "SD";
  if (r === "480p") return "480p";
  return r;
}
export type VideoModelDef = {
  id: string; name: string; tier: VideoModelTierSection; bestUse: string;
  textEndpoint: string | null; imageEndpoint: string | null; videoEndpoint: string | null;
  modes: VideoGenMode[]; nativeAudio: boolean; audioParam?: "generate_audio" | "audio";
  resolutions: VideoResolution[]; aspects: VideoAspect[]; durations: number[]; maxDuration: number;
  usdPerSec: number; audioUsdMult: number; res4kMult?: number; available: boolean;
  supportsNegativePrompt?: boolean; supportsSeed?: boolean; supportsMotionStrength?: boolean;
};
export function estimateModelCredits(opts: { model: VideoModelDef; durationSec: number; resolution: VideoResolution; soundOn: boolean; mode?: VideoGenMode; }): number {
  const { model, durationSec, resolution, soundOn, mode } = opts;
  if (!model.available) return 0;
  const d = Math.min(Math.max(1, durationSec), model.maxDuration);
  let usd = model.usdPerSec * d;
  if (soundOn && model.nativeAudio) usd *= model.audioUsdMult;
  if (resolution === "4k" && model.res4kMult) usd *= model.res4kMult;
  else if (resolution === "2k") usd *= 1.35;
  else if (resolution === "1080p") usd *= 1.0;
  else if (resolution === "720p") usd *= 0.95;
  else if (resolution === "480p") usd *= 0.85;
  const credits = Math.ceil((usd / 0.004) * 1.25);
  const floor = mode === "video" ? MIN_VIDEO_TO_VIDEO_CREDITS : MIN_VIDEO_CREDITS;
  return Math.max(floor, credits);
}
export const VIDEO_MODELS: VideoModelDef[] = [];
export function getVideoModel(id: string): VideoModelDef | undefined { return VIDEO_MODELS.find((m) => m.id === id); }
export function modelsForMode(mode: VideoGenMode): VideoModelDef[] { return VIDEO_MODELS.filter((m) => m.available && m.modes.includes(mode)); }
export function modelsInTier(tier: VideoTier, mode: VideoGenMode): VideoModelDef[] { return VIDEO_MODELS.filter((m) => m.available && m.tier === tier && m.modes.includes(mode)); }
export function capabilitiesForTier(tier: VideoTier, mode: VideoGenMode) {
  return { aspects: ["16:9"] as VideoAspect[], resolutions: ["720p"] as VideoResolution[], durations: [5], maxDuration: 5, nativeAudio: false, supportsNegativePrompt: false };
}
export function selectVideoModel(_opts: { mode: VideoGenMode; tier: VideoTier; durationSec: number; resolution: VideoResolution; aspect: VideoAspect; soundOn: boolean; }): VideoModelDef | null { return null; }
export function videoSelectionUnavailableMessage(_opts: { mode: VideoGenMode; tier: VideoTier; durationSec: number; resolution: VideoResolution; aspect: VideoAspect; soundOn: boolean; }): string { return "This combination isn't available yet."; }
export function availableMaxDurationFor(_tier: VideoTier, _mode: VideoGenMode): number { return 10; }
export function defaultModelForMode(_mode: VideoGenMode): VideoModelDef { return VIDEO_MODELS[0]; }
export function estimateRequestCredits(_opts: { mode: VideoGenMode; tier: VideoTier; durationSec: number; resolution: VideoResolution; aspect: VideoAspect; soundOn: boolean; }): number { return MIN_VIDEO_CREDITS; }
export const VIDEO_STYLE_MODIFIERS: Record<string, string> = {};
export function applyVideoStyle(prompt: string, _styleId: string | null | undefined): string { return prompt; }
