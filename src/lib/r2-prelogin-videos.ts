/**
 * Pre-login public video samples (assets.motio2edit.com).
 * Folder: samples/video/Video-1pre---1692login/
 * Dimensions from ffprobe. Titles/descriptions from visual inspection of frames.
 */
import type { R2Sample } from "@/lib/r2-catalog";

const BASE = "https://assets.motio2edit.com/samples/video/Video-1pre---1692login" as const;
const url = (name: string) => `${BASE}/${encodeURIComponent(name)}`;

function arLabel(w: number, h: number): string {
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.08) return "16:9";
  if (Math.abs(r - 3 / 2) < 0.08) return "3:2";
  if (Math.abs(r - 4 / 3) < 0.08) return "4:3";
  if (Math.abs(r - 1) < 0.05) return "1:1";
  return `${w}:${h}`;
}

export const PRELOGIN_VIDEO_SAMPLES: R2Sample[] = [
  {
    id: "pre-vid-korhw",
    title: "Luxury perfume motion",
    description: "Golden bottle and liquid swirl under studio light — product detail motion.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "samples",
    url: url("KOrHwIBusRu_dBBWwlrd1_sJfsw9iq.mp4"),
    filename: "KOrHwIBusRu_dBBWwlrd1_sJfsw9iq.mp4",
    width: 1264,
    height: 720,
    aspectRatio: arLabel(1264, 720),
    format: "MP4",
    qualityTier: "Premium",
    durationLabel: "~10s",
    hasAudio: true,
    sortOrder: 100,
    active: true,
  },
  {
    id: "pre-vid-rrlf",
    title: "Studio sports coupe",
    description: "Blue performance coupe under controlled studio lighting.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "samples",
    url: url("RRLfLnEpYRqEjo4dfBU4J_JUsouLIo.mp4"),
    filename: "RRLfLnEpYRqEjo4dfBU4J_JUsouLIo.mp4",
    width: 1168,
    height: 768,
    aspectRatio: arLabel(1168, 768),
    format: "MP4",
    qualityTier: "Premium",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 110,
    active: true,
  },
  {
    id: "pre-vid-yrpc",
    title: "Hilltop tower scene",
    description: "Wide outdoor structure against open sky — cinematic environment motion.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "samples",
    url: url("YrpCjdm11gyt4DxE8HqAA_alligator.mp4"),
    filename: "YrpCjdm11gyt4DxE8HqAA_alligator.mp4",
    width: 1088,
    height: 800,
    aspectRatio: arLabel(1088, 800),
    format: "MP4",
    qualityTier: "Premium",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 120,
    active: true,
  },
  {
    id: "pre-vid-bra1",
    title: "Night city drive",
    description: "Blue coupe on wet streets under city lights and a full moon.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "samples",
    url: url("brA1rW-EtsIvmGDU8EMnq_uf0mS6DL.mp4"),
    filename: "brA1rW-EtsIvmGDU8EMnq_uf0mS6DL.mp4",
    width: 1264,
    height: 720,
    aspectRatio: arLabel(1264, 720),
    format: "MP4",
    qualityTier: "Premium",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 130,
    active: true,
  },
  {
    id: "pre-vid-gxd5",
    title: "Desert red dress",
    description: "Figure in flowing red fabric across sand dunes at golden hour.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "samples",
    url: url("gXd5vKral-j0AC-1rr3fx_alligator.mp4"),
    filename: "gXd5vKral-j0AC-1rr3fx_alligator.mp4",
    width: 1088,
    height: 800,
    aspectRatio: arLabel(1088, 800),
    format: "MP4",
    qualityTier: "Premium",
    durationLabel: "~10s",
    hasAudio: true,
    sortOrder: 140,
    active: true,
  },
  {
    id: "pre-vid-ie3w",
    title: "Noir rain street",
    description: "Black-and-white night scene — coat and fedora under street lamps in the rain.",
    studio: "video",
    feature: "video-generation",
    homepageCategory: "samples",
    url: url("iE3wx5ctU6NXD3iWTOckr_alligator.mp4"),
    filename: "iE3wx5ctU6NXD3iWTOckr_alligator.mp4",
    width: 1280,
    height: 704,
    aspectRatio: arLabel(1280, 704),
    format: "MP4",
    qualityTier: "Premium",
    durationLabel: "~15s",
    hasAudio: true,
    sortOrder: 150,
    active: true,
  },
];

export function getPreloginVideoSamples(): R2Sample[] {
  return PRELOGIN_VIDEO_SAMPLES.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
}
