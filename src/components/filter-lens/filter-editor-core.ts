/** Shared Filters editor helpers — adjust pipeline + watermark (output only). */
import type { FilterDefinition } from "@/lib/filter-lens/filters/filter-types";
import type { RGBAImage } from "@/lib/filter-lens/shared/processing-types";
import { cloneImage } from "@/lib/filter-lens/filters/filter-engine";
import type { LucideIcon } from "lucide-react";
import { SunMedium, Contrast, Palette, Aperture, CircleDot, Focus, Sparkles } from "lucide-react";

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  description?: string;
  intensityDefault: number;
  isFree: boolean;
  kind: "filter" | "lens";
  badge?: "premium" | "ai+" | null;
};

export function filterToCatalogItem(f: FilterDefinition, index = 0): CatalogItem {
  let badge: "premium" | "ai+" | null = null;
  if (index >= 10) badge = index % 7 === 0 ? "ai+" : "premium";
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    description: f.description,
    intensityDefault: f.intensityRange?.default ?? 85,
    isFree: index < 10 || !!f.unlock?.isFree,
    kind: "filter",
    badge,
  };
}

export type AdjustValues = {
  light: number; shadow: number; color: number; hue: number;
  vignette: number; sharpness: number; grain: number;
};
export type AdjustKey = keyof AdjustValues;

export const DEFAULT_ADJ: AdjustValues = {
  light: 0, shadow: 0, color: 0, hue: 0, vignette: 0, sharpness: 0, grain: 0,
};

export const COLOR_SWATCHES = [
  { id: "neutral", label: "Neutral", rgb: [128, 128, 128] as const },
  { id: "red", label: "Red", rgb: [220, 60, 60] as const },
  { id: "orange", label: "Orange", rgb: [255, 140, 40] as const },
  { id: "yellow", label: "Yellow", rgb: [240, 200, 40] as const },
  { id: "green", label: "Green", rgb: [50, 180, 90] as const },
  { id: "cyan", label: "Cyan", rgb: [40, 180, 200] as const },
  { id: "blue", label: "Blue", rgb: [50, 100, 220] as const },
  { id: "purple", label: "Purple", rgb: [140, 70, 200] as const },
];

export const ADJUST_META: { key: AdjustKey; label: string; icon: LucideIcon; min: number; max: number }[] = [
  { key: "light", label: "Light", icon: SunMedium, min: -50, max: 50 },
  { key: "shadow", label: "Shadow", icon: Contrast, min: -50, max: 50 },
  { key: "color", label: "Color", icon: Palette, min: -50, max: 50 },
  { key: "hue", label: "Hue", icon: Aperture, min: -180, max: 180 },
  { key: "vignette", label: "Vignette", icon: CircleDot, min: 0, max: 100 },
  { key: "sharpness", label: "Sharpness", icon: Focus, min: 0, max: 100 },
  { key: "grain", label: "Grain", icon: Sparkles, min: 0, max: 100 },
];

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function applyUserAdjustments(
  image: RGBAImage,
  adj: AdjustValues,
  colorTint: readonly [number, number, number] | null,
): RGBAImage {
  const working = cloneImage(image);
  const data = working.data;
  const { light, shadow, color, hue, vignette, sharpness, grain } = adj;

  if (light !== 0 || shadow !== 0 || color !== 0 || hue !== 0 || colorTint) {
    const hueRad = (hue * Math.PI) / 180;
    const cosH = Math.cos(hueRad);
    const sinH = Math.sin(hueRad);
    const satMul = 1 + color / 50;
    const tintAmt = colorTint ? 0.12 + Math.abs(color) / 200 : 0;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      if (light !== 0) {
        const exp = Math.pow(2, light / 60);
        r *= exp; g *= exp; b *= exp;
      }
      if (shadow !== 0) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const w = 1 - Math.min(1, l / 128);
        const lift = shadow * 0.55 * w;
        r += lift; g += lift; b += lift;
      }
      if (hue !== 0) {
        const yr = 0.299 * r + 0.587 * g + 0.114 * b;
        const iR = r - yr, iB = b - yr, iG = g - yr;
        r = yr + (iR * cosH - iB * sinH);
        g = yr + (iG * cosH - (iR - iB) * 0.3 * sinH);
        b = yr + (iR * sinH + iB * cosH);
      }
      if (color !== 0) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * satMul;
        g = l + (g - l) * satMul;
        b = l + (b - l) * satMul;
      }
      if (colorTint && tintAmt > 0) {
        r = r * (1 - tintAmt) + colorTint[0] * tintAmt;
        g = g * (1 - tintAmt) + colorTint[1] * tintAmt;
        b = b * (1 - tintAmt) + colorTint[2] * tintAmt;
      }
      data[i] = clamp8(r); data[i + 1] = clamp8(g); data[i + 2] = clamp8(b);
    }
  }
  if (vignette > 0) {
    const cx = working.width / 2, cy = working.height / 2;
    const maxD = Math.hypot(cx, cy);
    const strength = vignette / 100;
    for (let y = 0; y < working.height; y++) {
      for (let x = 0; x < working.width; x++) {
        const d = Math.hypot(x - cx, y - cy) / maxD;
        const v = 1 - strength * Math.pow(d, 1.6);
        const i = (y * working.width + x) * 4;
        data[i] = clamp8(data[i] * v);
        data[i + 1] = clamp8(data[i + 1] * v);
        data[i + 2] = clamp8(data[i + 2] * v);
      }
    }
  }
  if (sharpness > 0) {
    const amount = sharpness / 100;
    const copy = new Uint8ClampedArray(data);
    const w = working.width, h = working.height;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[i + c];
          const blur =
            (copy[((y - 1) * w + x) * 4 + c] + copy[((y + 1) * w + x) * 4 + c] +
              copy[(y * w + x - 1) * 4 + c] + copy[(y * w + x + 1) * 4 + c]) / 4;
          data[i + c] = clamp8(center + (center - blur) * amount * 1.4);
        }
      }
    }
  }
  if (grain > 0) {
    const rnd = mulberry32(42);
    const strength = grain * 0.35;
    for (let i = 0; i < data.length; i += 4) {
      const n = (rnd() - 0.5) * strength;
      data[i] = clamp8(data[i] + n);
      data[i + 1] = clamp8(data[i + 1] + n);
      data[i + 2] = clamp8(data[i + 2] + n);
    }
  }
  return working;
}

export function hasAdj(adj: AdjustValues, colorId: string): boolean {
  return (
    adj.light !== 0 || adj.shadow !== 0 || adj.color !== 0 || adj.hue !== 0 ||
    adj.vignette !== 0 || adj.sharpness !== 0 || adj.grain !== 0 || colorId !== "neutral"
  );
}

export async function applyOutputWatermark(srcUrl: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("wm load"));
    img.src = srcUrl;
  });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const pad = Math.max(12, Math.round(Math.min(c.width, c.height) * 0.02));
  const fs = Math.max(11, Math.round(Math.min(c.width, c.height) * 0.028));
  ctx.save();
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 4;
  ctx.fillText("MOTIO2EDIT", c.width - pad, c.height - pad);
  ctx.restore();
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("wm blob"))), "image/jpeg", 0.94);
  });
}
