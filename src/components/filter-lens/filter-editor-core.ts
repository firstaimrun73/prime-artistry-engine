/** Shared Filters editor helpers — adjust pipeline + output-only watermark. */
import type { FilterDefinition } from "@/lib/filter-lens/filters/filter-types";
import type { RGBAImage } from "@/lib/filter-lens/shared/processing-types";
import { cloneImage } from "@/lib/filter-lens/filters/filter-engine";
import type { LucideIcon } from "lucide-react";
import { SunMedium, Contrast, Palette, Aperture, CircleDot, Focus } from "lucide-react";
import { createElement, type SVGProps } from "react";

export function GrainIcon(props: SVGProps<SVGSVGElement>) {
  const dots: [number, number, number][] = [
    [6, 7, 1.1], [11, 5, 0.9], [16, 7, 1.1], [8, 12, 1], [13, 11, 1.15],
    [18, 12, 0.9], [5, 17, 1], [10, 18, 1.1], [15, 16, 0.95], [19, 18, 1],
  ];
  return createElement(
    "svg",
    { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", ...props },
    ...dots.map(([cx, cy, r]) =>
      createElement("circle", { key: `${cx}-${cy}`, cx, cy, r, fill: "currentColor", stroke: "none" }),
    ),
  );
}

export type CatalogBadge = "ai+" | "pro" | "premium" | null;

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  description?: string;
  intensityDefault: number;
  isFree: boolean;
  kind: "filter" | "lens";
  badge: CatalogBadge;
  animatedThumb?: boolean;
};

/** First 5 free AI filters; rest Premium / AI+. */
export function filterToCatalogItem(f: FilterDefinition, index = 0): CatalogItem {
  const isFree = index < 5 || !!f.unlock?.isFree;
  let badge: CatalogBadge = null;
  if (!isFree && f.tier) {
    if (f.tier === "ai+" || f.tier === "pro" || f.tier === "premium") {
      badge = f.tier;
    }
  }
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    description: f.description,
    intensityDefault: f.intensityRange?.default ?? 85,
    isFree,
    kind: "filter",
    badge,
    animatedThumb: !!f.animatedThumb,
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
  { id: "neutral", label: "Neutral", rgb: [128, 128, 128] as const, hex: "#808080" },
  { id: "red", label: "Red", rgb: [220, 60, 60] as const, hex: "#DC3C3C" },
  { id: "orange", label: "Orange", rgb: [255, 140, 40] as const, hex: "#FF8C28" },
  { id: "yellow", label: "Yellow", rgb: [240, 200, 40] as const, hex: "#F0C828" },
  { id: "green", label: "Green", rgb: [50, 180, 90] as const, hex: "#32B45A" },
  { id: "cyan", label: "Cyan", rgb: [40, 180, 200] as const, hex: "#28B4C8" },
  { id: "blue", label: "Blue", rgb: [50, 100, 220] as const, hex: "#3264DC" },
  { id: "purple", label: "Purple", rgb: [140, 70, 200] as const, hex: "#8C46C8" },
];

export const ADJUST_META: { key: AdjustKey; label: string; icon: LucideIcon | typeof GrainIcon; min: number; max: number }[] = [
  { key: "light", label: "Light", icon: SunMedium, min: -50, max: 50 },
  { key: "shadow", label: "Shadow", icon: Contrast, min: -50, max: 50 },
  { key: "color", label: "Color", icon: Palette, min: -50, max: 50 },
  { key: "hue", label: "Hue", icon: Aperture, min: -180, max: 180 },
  { key: "vignette", label: "Vignette", icon: CircleDot, min: 0, max: 100 },
  { key: "sharpness", label: "Sharpness", icon: Focus, min: 0, max: 100 },
  { key: "grain", label: "Grain", icon: GrainIcon, min: 0, max: 100 },
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

/**
 * Motio2edit watermark on OUTPUT only — balanced two-line lockup:
 * Motio[2]edit
 * Filters (sparkle on i)
 * Both lines share the same visual center axis.
 */
export async function applyOutputWatermark(srcUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("wm src load"));
    i.src = srcUrl;
  });

  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const minDim = Math.min(c.width, c.height);
  const fsMain = Math.max(20, Math.round(minDim * 0.048));
  const fsSub = Math.max(15, Math.round(fsMain * 0.78));
  const pad = Math.max(14, Math.round(minDim * 0.03));
  const lineGap = Math.round(fsMain * 0.22);

  ctx.save();
  ctx.globalAlpha = 0.93;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = Math.max(5, Math.round(minDim * 0.008));
  ctx.shadowOffsetY = 1;
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 ${fsMain}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const wMotio = ctx.measureText("Motio").width;
  const w2 = ctx.measureText("2").width;
  const wEdit = ctx.measureText("edit").width;
  const wLine1 = wMotio + w2 + wEdit;

  ctx.font = `700 ${fsSub}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const wLine2 = ctx.measureText("Filters").width;

  const blockW = Math.max(wLine1, wLine2);
  const blockRight = c.width - pad;
  const blockCenterX = blockRight - blockW / 2;

  const y2 = c.height - pad;
  const y1 = y2 - fsSub - lineGap;

  ctx.font = `700 ${fsMain}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  let x = blockCenterX - wLine1 / 2;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillText("Motio", x, y1);
  x += wMotio;
  ctx.fillStyle = "#FF5A1F";
  ctx.fillText("2", x, y1);
  x += w2;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillText("edit", x, y1);

  ctx.font = `700 ${fsSub}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const filtersX = blockCenterX - wLine2 / 2;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillText("Filters", filtersX, y2);

  const wF = ctx.measureText("F").width;
  const wI = ctx.measureText("i").width;
  const sparkX = filtersX + wF + wI * 0.5;
  const sparkY = y2 - fsSub * 0.92;
  const sp = Math.max(2.5, Math.round(fsSub * 0.16));
  ctx.fillStyle = "#FF5A1F";
  ctx.beginPath();
  ctx.moveTo(sparkX, sparkY - sp);
  ctx.lineTo(sparkX + sp * 0.32, sparkY - sp * 0.32);
  ctx.lineTo(sparkX + sp, sparkY);
  ctx.lineTo(sparkX + sp * 0.32, sparkY + sp * 0.32);
  ctx.lineTo(sparkX, sparkY + sp);
  ctx.lineTo(sparkX - sp * 0.32, sparkY + sp * 0.32);
  ctx.lineTo(sparkX - sp, sparkY);
  ctx.lineTo(sparkX - sp * 0.32, sparkY - sp * 0.32);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  return new Promise((resolve, reject) => {
    c.toBlob(
      (b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("wm blob"))),
      "image/jpeg",
      0.94,
    );
  });
}
