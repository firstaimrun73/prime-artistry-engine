/**
 * filters/filter-engine.ts — Motio2edit programmatic image processing.
 * Never mutates input; preserves alpha; preview + full modes.
 * Meaningful pixel transforms for all filter profiles.
 */
import {
  ProcessingProfile,
  ProcessOptions,
  ProcessResult,
  RGBAImage,
  ToneCurvePoint,
} from '../shared/processing-types';

export function cloneImage(image: RGBAImage): RGBAImage {
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

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

/** Bilinear downscale for preview only — never used as Apply/Download source. */
export function downscale(image: RGBAImage, maxDimension: number): RGBAImage {
  const long = Math.max(image.width, image.height);
  if (long <= maxDimension) return cloneImage(image);
  const scale = maxDimension / long;
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  const xRatio = (image.width - 1) / Math.max(1, w - 1);
  const yRatio = (image.height - 1) / Math.max(1, h - 1);
  for (let y = 0; y < h; y++) {
    const sy = y * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = x * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const fx = sx - x0;
      const i00 = (y0 * image.width + x0) * 4;
      const i10 = (y0 * image.width + x1) * 4;
      const i01 = (y1 * image.width + x0) * 4;
      const i11 = (y1 * image.width + x1) * 4;
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v0 = image.data[i00 + c] * (1 - fx) + image.data[i10 + c] * fx;
        const v1 = image.data[i01 + c] * (1 - fx) + image.data[i11 + c] * fx;
        out[di + c] = (v0 * (1 - fy) + v1 * fy + 0.5) | 0;
      }
    }
  }
  return { width: w, height: h, data: out };
}

function applyExposureContrast(data: Uint8ClampedArray, exposure: number, contrast: number, brightness: number) {
  const exp = Math.pow(2, exposure / 50);
  const c = 1 + contrast / 100;
  const b = brightness * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      let v = data[i + ch] * exp + b;
      v = (v - 128) * c + 128;
      data[i + ch] = clamp8(v);
    }
  }
}

function applyHighlightsShadows(data: Uint8ClampedArray, highlights: number, shadows: number) {
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const shadowW = 1 - Math.min(1, l / 128);
    const highW = Math.min(1, Math.max(0, (l - 128) / 127));
    const adj = shadows * 0.4 * shadowW + highlights * 0.4 * highW;
    for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp8(data[i + ch] + adj);
  }
}

function applyTemperatureTint(data: Uint8ClampedArray, temperature: number, tint: number) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] + temperature * 0.55);
    data[i + 1] = clamp8(data[i + 1] + tint * 0.35);
    data[i + 2] = clamp8(data[i + 2] - temperature * 0.55);
  }
}

function applySaturationVibrance(data: Uint8ClampedArray, saturation: number, vibrance: number) {
  const s = 1 + saturation / 100;
  const v = vibrance / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
    const sat = maxc === minc ? 0 : 1 - minc / (maxc + 1e-6);
    const boost = s + v * (1 - sat);
    data[i] = clamp8(l + (r - l) * boost);
    data[i + 1] = clamp8(l + (g - l) * boost);
    data[i + 2] = clamp8(l + (b - l) * boost);
  }
}

function applyMonochromeSepia(data: Uint8ClampedArray, mono: boolean, sepia: number) {
  const t = Math.min(1, Math.max(0, sepia / 100));
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (mono) {
      data[i] = clamp8(g);
      data[i + 1] = clamp8(g);
      data[i + 2] = clamp8(g);
    } else if (t > 0) {
      const sr = g * 1.07 + 20 * t;
      const sg = g * 0.96 + 10 * t;
      const sb = g * 0.78;
      data[i] = clamp8(data[i] * (1 - t) + sr * t);
      data[i + 1] = clamp8(data[i + 1] * (1 - t) + sg * t);
      data[i + 2] = clamp8(data[i + 2] * (1 - t) + sb * t);
    }
  }
}

function applySplitToning(
  data: Uint8ClampedArray,
  settings: { shadowsHue: number; shadowsSaturation: number; highlightsHue: number; highlightsSaturation: number; balance: number },
) {
  const sh = ((settings.shadowsHue % 360) * Math.PI) / 180;
  const hh = ((settings.highlightsHue % 360) * Math.PI) / 180;
  const ss = settings.shadowsSaturation / 100;
  const hs = settings.highlightsSaturation / 100;
  const bal = settings.balance / 100;
  for (let i = 0; i < data.length; i += 4) {
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    const shadowW = Math.max(0, 1 - l * 2 + bal);
    const highW = Math.max(0, l * 2 - 1 - bal);
    const sr = Math.cos(sh) * ss * shadowW * 40;
    const sg = Math.cos(sh + 2.094) * ss * shadowW * 40;
    const sb = Math.cos(sh + 4.188) * ss * shadowW * 40;
    const hr = Math.cos(hh) * hs * highW * 40;
    const hg = Math.cos(hh + 2.094) * hs * highW * 40;
    const hb = Math.cos(hh + 4.188) * hs * highW * 40;
    data[i] = clamp8(data[i] + sr + hr);
    data[i + 1] = clamp8(data[i + 1] + sg + hg);
    data[i + 2] = clamp8(data[i + 2] + sb + hb);
  }
}

function applyFade(data: Uint8ClampedArray, fade: number) {
  const t = Math.min(1, Math.max(0, fade / 100));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] * (1 - t * 0.35) + 40 * t);
    data[i + 1] = clamp8(data[i + 1] * (1 - t * 0.35) + 40 * t);
    data[i + 2] = clamp8(data[i + 2] * (1 - t * 0.35) + 40 * t);
  }
}

function applyGrain(data: Uint8ClampedArray, grain: number, seed: number) {
  if (grain <= 0) return;
  const rnd = mulberry32(seed);
  const amp = grain * 0.55;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rnd() - 0.5) * amp;
    data[i] = clamp8(data[i] + n);
    data[i + 1] = clamp8(data[i + 1] + n);
    data[i + 2] = clamp8(data[i + 2] + n);
  }
}

function applyVignette(image: RGBAImage, amount: number, feather: number) {
  if (!amount) return;
  const w = image.width, h = image.height;
  const cx = w / 2, cy = h / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  const strength = amount / 100;
  const soft = Math.max(0.15, Math.min(0.95, (feather || 50) / 100));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const v = Math.max(0, (d - (1 - soft)) / soft);
      const factor = 1 - v * v * strength;
      const i = (y * w + x) * 4;
      image.data[i] = clamp8(image.data[i] * factor);
      image.data[i + 1] = clamp8(image.data[i + 1] * factor);
      image.data[i + 2] = clamp8(image.data[i + 2] * factor);
    }
  }
}

function applySharpen(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const t = amount / 100;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        const blur =
          (src[i - 4 + c] + src[i + 4 + c] + src[i - w * 4 + c] + src[i + w * 4 + c] + center * 4) / 8;
        image.data[i + c] = clamp8(center + (center - blur) * t * 2);
      }
    }
  }
}

function applyPosterize(data: Uint8ClampedArray, levels: number) {
  const n = Math.max(2, Math.min(16, Math.round(levels)));
  const step = 255 / (n - 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i + c] = clamp8(Math.round(data[i + c] / step) * step);
    }
  }
}

function applyEdgeMix(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  const t = Math.min(1, amount / 100);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      let gx = 0, gy = 0;
      for (let c = 0; c < 3; c++) {
        const tl = src[((y - 1) * w + (x - 1)) * 4 + c];
        const tm = src[((y - 1) * w + x) * 4 + c];
        const tr = src[((y - 1) * w + (x + 1)) * 4 + c];
        const ml = src[(y * w + (x - 1)) * 4 + c];
        const mr = src[(y * w + (x + 1)) * 4 + c];
        const bl = src[((y + 1) * w + (x - 1)) * 4 + c];
        const bm = src[((y + 1) * w + x) * 4 + c];
        const br = src[((y + 1) * w + (x + 1)) * 4 + c];
        gx += -tl - 2 * ml - bl + tr + 2 * mr + br;
        gy += -tl - 2 * tm - tr + bl + 2 * bm + br;
      }
      const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy) / 3);
      const edge = 255 - mag;
      for (let c = 0; c < 3; c++) {
        image.data[i + c] = clamp8(src[i + c] * (1 - t) + edge * t);
      }
    }
  }
}

function applyPixelate(image: RGBAImage, block: number) {
  const b = Math.max(2, Math.min(32, Math.round(block)));
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  for (let y = 0; y < h; y += b) {
    for (let x = 0; x < w; x += b) {
      let r = 0, g = 0, bl = 0, n = 0;
      const y2 = Math.min(h, y + b), x2 = Math.min(w, x + b);
      for (let yy = y; yy < y2; yy++) {
        for (let xx = x; xx < x2; xx++) {
          const i = (yy * w + xx) * 4;
          r += src[i]; g += src[i + 1]; bl += src[i + 2]; n++;
        }
      }
      r = (r / n) | 0; g = (g / n) | 0; bl = (bl / n) | 0;
      for (let yy = y; yy < y2; yy++) {
        for (let xx = x; xx < x2; xx++) {
          const i = (yy * w + xx) * 4;
          image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = bl;
        }
      }
    }
  }
}

function applyBloom(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const t = Math.min(1, amount / 100);
  const w = image.width, h = image.height;
  const src = new Uint8ClampedArray(image.data);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = (y * w + x) * 4;
      let br = 0, bg = 0, bb = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const j = ((y + dy) * w + (x + dx)) * 4;
          const lum = 0.299 * src[j] + 0.587 * src[j + 1] + 0.114 * src[j + 2];
          if (lum > 180) {
            br += src[j]; bg += src[j + 1]; bb += src[j + 2]; n++;
          }
        }
      }
      if (n > 0) {
        image.data[i] = clamp8(src[i] + (br / n - src[i]) * t * 0.55);
        image.data[i + 1] = clamp8(src[i + 1] + (bg / n - src[i + 1]) * t * 0.55);
        image.data[i + 2] = clamp8(src[i + 2] + (bb / n - src[i + 2]) * t * 0.55);
      }
    }
  }
}

function applySoftBlur(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  const passes = Math.max(1, Math.min(4, Math.round(amount / 25)));
  const w = image.width, h = image.height;
  for (let p = 0; p < passes; p++) {
    const src = new Uint8ClampedArray(image.data);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              sum += src[((y + dy) * w + (x + dx)) * 4 + c];
          image.data[i + c] = (sum / 9) | 0;
        }
      }
    }
  }
}

function applyDuotone(
  data: Uint8ClampedArray,
  shadow: [number, number, number],
  highlight: [number, number, number],
) {
  for (let i = 0; i < data.length; i += 4) {
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    data[i] = clamp8(shadow[0] + (highlight[0] - shadow[0]) * l);
    data[i + 1] = clamp8(shadow[1] + (highlight[1] - shadow[1]) * l);
    data[i + 2] = clamp8(shadow[2] + (highlight[2] - shadow[2]) * l);
  }
}

function applyNeonStyle(data: Uint8ClampedArray, amount: number) {
  const t = Math.min(1, amount / 100);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    data[i] = clamp8(r * (1 - t * 0.15) + Math.max(r, b) * t * 0.35);
    data[i + 1] = clamp8(g * (1 - t * 0.1) + Math.max(g, b) * t * 0.45);
    data[i + 2] = clamp8(b * (1 + t * 0.55));
  }
}

function applyContrastish(data: Uint8ClampedArray, contrast: number) {
  const c = 1 + contrast / 100;
  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      data[i + ch] = clamp8((data[i + ch] - 128) * c + 128);
    }
  }
}

function applyDenoise(image: RGBAImage, amount: number) {
  if (amount <= 0) return;
  applySoftBlur(image, Math.min(40, amount * 0.6));
}

function applyDynamicRange(data: Uint8ClampedArray, amount: number) {
  if (!amount) return;
  const t = amount / 100;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const shadowLift = (1 - Math.min(1, l / 140)) * t * 28;
    const highPull = Math.max(0, (l - 180) / 75) * t * 22;
    for (let c = 0; c < 3; c++) data[i + c] = clamp8(data[i + c] + shadowLift - highPull);
  }
}

function applyAtmosphere(data: Uint8ClampedArray, amount: number) {
  if (!amount) return;
  const t = Math.abs(amount) / 100;
  const cool = amount < 0;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp8(data[i] * (1 - t * 0.12) + (cool ? 30 : 20) * t);
    data[i + 1] = clamp8(data[i + 1] * (1 - t * 0.1) + (cool ? 35 : 25) * t);
    data[i + 2] = clamp8(data[i + 2] * (1 - t * 0.08) + (cool ? 50 : 15) * t);
  }
}

/** True comic/illustration: smooth flat color regions + crisp black ink contours.
 * Works across portraits, product, nature, architecture — preserves structure. */
function applyComicStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));

  // 1) Luminance from ORIGINAL (stable edge map)
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 2) Sobel edge map
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const gx =
        -gray[p - w - 1] - 2 * gray[p - 1] - gray[p + w - 1] +
         gray[p - w + 1] + 2 * gray[p + 1] + gray[p + w + 1];
      const gy =
        -gray[p - w - 1] - 2 * gray[p - w] - gray[p - w + 1] +
         gray[p + w - 1] + 2 * gray[p + w] + gray[p + w + 1];
      edge[p] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Mild dilation so thin lines (veins, hair, product edges) stay readable
  const edgeDil = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      let m = edge[p];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          m = Math.max(m, edge[(y + dy) * w + (x + dx)]);
      edgeDil[p] = m;
    }
  }

  // 3) Edge-aware smooth — flat fills without destroying structure
  const smoothPasses = 2 + Math.round(t);
  let curR = new Float32Array(w * h);
  let curG = new Float32Array(w * h);
  let curB = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    curR[p] = data[i]; curG[p] = data[i + 1]; curB[p] = data[i + 2];
  }
  for (let pass = 0; pass < smoothPasses; pass++) {
    const nR = new Float32Array(w * h);
    const nG = new Float32Array(w * h);
    const nB = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (edgeDil[p] > 90) {
          nR[p] = curR[p]; nG[p] = curG[p]; nB[p] = curB[p];
          continue;
        }
        let sr = 0, sg = 0, sb = 0, sw = 0;
        const cLum = 0.299 * curR[p] + 0.587 * curG[p] + 0.114 * curB[p];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const q = (y + dy) * w + (x + dx);
            const qLum = 0.299 * curR[q] + 0.587 * curG[q] + 0.114 * curB[q];
            const wgt = 1 / (1 + Math.abs(cLum - qLum) * 0.08 + edgeDil[q] * 0.02);
            sr += curR[q] * wgt; sg += curG[q] * wgt; sb += curB[q] * wgt; sw += wgt;
          }
        }
        nR[p] = sr / sw; nG[p] = sg / sw; nB[p] = sb / sw;
      }
    }
    for (let x = 0; x < w; x++) {
      nR[x] = curR[x]; nG[x] = curG[x]; nB[x] = curB[x];
      const b = (h - 1) * w + x;
      nR[b] = curR[b]; nG[b] = curG[b]; nB[b] = curB[b];
    }
    for (let y = 0; y < h; y++) {
      const L = y * w, R = L + w - 1;
      nR[L] = curR[L]; nG[L] = curG[L]; nB[L] = curB[L];
      nR[R] = curR[R]; nG[R] = curG[R]; nB[R] = curB[R];
    }
    curR = nR; curG = nG; curB = nB;
  }

  // 4) Quantize to comic flat colors (5–7 levels keeps detail on varied subjects)
  const levels = 5 + Math.round(t * 2);
  const step = 255 / (levels - 1);
  const satBoost = 1.15 + t * 0.35;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    let r = curR[p], g = curG[p], b = curB[p];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * satBoost;
    g = l + (g - l) * satBoost;
    b = l + (b - l) * satBoost;
    data[i] = clamp8(Math.round(r / step) * step);
    data[i + 1] = clamp8(Math.round(g / step) * step);
    data[i + 2] = clamp8(Math.round(b / step) * step);
  }

  // 5) Hard black ink lines from edge map (adaptive, soft falloff)
  const thr = 55 - t * 18;
  const inkDark = 12;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const e = edgeDil[p];
    if (e > thr) {
      const k = Math.min(1, (e - thr) / (thr * 0.9 + 20));
      const ink = inkDark + (1 - k) * 40;
      data[i] = clamp8(data[i] * (1 - k) + ink * k);
      data[i + 1] = clamp8(data[i + 1] * (1 - k) + ink * k);
      data[i + 2] = clamp8(data[i + 2] * (1 - k) + ink * k);
    }
  }

  // 6) Graphic punch
  applyContrastish(data, 10 + t * 14);
}

/** Pencil-sketch via classic grayscale + inverted-blur color-dodge. */
function applySketchStyle(image: RGBAImage, intensity: number) {
  const w = image.width, h = image.height;
  const data = image.data;
  const t = Math.max(0.4, Math.min(1, intensity / 100));
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const inv = new Float32Array(w * h);
  for (let p = 0; p < gray.length; p++) inv[p] = 255 - gray[p];
  let cur = inv;
  const passes = 3 + Math.round(t * 2);
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            s += cur[(y + dy) * w + (x + dx)];
        next[y * w + x] = s / 9;
      }
    }
    for (let x = 0; x < w; x++) {
      next[x] = cur[x];
      next[(h - 1) * w + x] = cur[(h - 1) * w + x];
    }
    for (let y = 0; y < h; y++) {
      next[y * w] = cur[y * w];
      next[y * w + w - 1] = cur[y * w + w - 1];
    }
    cur = next;
  }
  const paper = 245;
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const denom = 255 - cur[p] + 1e-3;
    let v = (gray[p] * 255) / denom;
    if (v > 255) v = 255;
    const line = Math.min(255, v);
    const g = line * (0.92 + 0.08 * (1 - t)) + paper * 0.04 * (1 - t);
    data[i] = clamp8(g * 1.02);
    data[i + 1] = clamp8(g * 1.0);
    data[i + 2] = clamp8(g * 0.96);
  }
  applyGrain(data, 6 + t * 8, 42);
}

function applyStyle(image: RGBAImage, style: string | undefined, intensity: number) {
  if (!style || style === 'none') return;
  const t = Math.max(0, Math.min(100, intensity));
  if (style === 'sketch') {
    applySketchStyle(image, t);
  } else if (style === 'comic') {
    applyComicStyle(image, t);
  } else if (style === 'oil') {
    applySoftBlur(image, 40 + t * 0.3);
    applyPosterize(image.data, 8);
    applySaturationVibrance(image.data, 12, 8);
  } else if (style === 'watercolor') {
    applySoftBlur(image, 50 + t * 0.2);
    applySaturationVibrance(image.data, 20, 15);
    applyFade(image.data, 15);
  } else if (style === 'neon') {
    applyNeonStyle(image.data, 60 + t * 0.3);
    applyContrastish(image.data, 20);
  }
}

function scaleProfile(profile: ProcessingProfile, intensity: number): ProcessingProfile {
  const t = Math.max(0, Math.min(100, intensity)) / 100;
  const s = (v?: number) => (v == null ? undefined : v * t);
  return {
    exposure: s(profile.exposure),
    brightness: s(profile.brightness),
    contrast: s(profile.contrast),
    highlights: s(profile.highlights),
    shadows: s(profile.shadows),
    temperature: s(profile.temperature),
    tint: s(profile.tint),
    saturation: s(profile.saturation),
    vibrance: s(profile.vibrance),
    gamma: profile.gamma,
    monochrome: profile.monochrome,
    sepia: s(profile.sepia),
    fade: s(profile.fade),
    grain: s(profile.grain),
    vignette: s(profile.vignette),
    vignetteFeather: profile.vignetteFeather,
    sharpening: s(profile.sharpening),
    clarity: s(profile.clarity),
    bloom: s(profile.bloom),
    blur: s(profile.blur),
    denoise: s(profile.denoise),
    microcontrast: s(profile.microcontrast),
    dynamicRange: s(profile.dynamicRange),
    starSeparation: s(profile.starSeparation),
    atmosphere: s(profile.atmosphere),
    splitToning: profile.splitToning,
    toneCurve: profile.toneCurve,
    channelAdjustments: profile.channelAdjustments,
    posterizeLevels: profile.posterizeLevels,
    edgeAmount: s(profile.edgeAmount),
    pixelSize: profile.pixelSize,
    softBlur: s(profile.softBlur),
    duotone: profile.duotone,
    style: profile.style,
  };
}

export function applyProcessingProfile(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  const working = cloneImage(image);
  const p = scaleProfile(profile, options.intensity);
  const data = working.data;

  if (options.isCancelled?.()) return { image: working, cancelled: true, isPreview: options.mode === 'preview' };

  applyExposureContrast(data, p.exposure ?? 0, p.contrast ?? 0, p.brightness ?? 0);
  applyHighlightsShadows(data, p.highlights ?? 0, p.shadows ?? 0);
  applyTemperatureTint(data, p.temperature ?? 0, p.tint ?? 0);
  applySaturationVibrance(data, p.saturation ?? 0, p.vibrance ?? 0);
  applyMonochromeSepia(data, !!p.monochrome, p.sepia ?? 0);
  if (p.splitToning) applySplitToning(data, p.splitToning);
  applyFade(data, p.fade ?? 0);
  if (p.softBlur) applySoftBlur(working, p.softBlur);
  if (p.denoise) applyDenoise(working, p.denoise);
  if (p.dynamicRange) applyDynamicRange(data, p.dynamicRange);
  if (p.atmosphere) applyAtmosphere(data, p.atmosphere);
  if (p.bloom) applyBloom(working, p.bloom);
  if (p.clarity) applySharpen(working, Math.abs(p.clarity) * 0.55);
  if (p.microcontrast) applySharpen(working, Math.abs(p.microcontrast) * 0.4);
  applySharpen(working, p.sharpening ?? 0);
  if (p.posterizeLevels) applyPosterize(data, p.posterizeLevels);
  if (p.edgeAmount) applyEdgeMix(working, p.edgeAmount);
  if (p.pixelSize) applyPixelate(working, p.pixelSize);
  if (p.duotone) applyDuotone(data, p.duotone.shadow, p.duotone.highlight);
  if (p.style && p.style !== 'none') applyStyle(working, p.style, options.intensity);
  applyVignette(working, p.vignette ?? 0, p.vignetteFeather ?? 50);
  applyGrain(data, p.grain ?? 0, options.seed ?? 42);

  return { image: working, cancelled: false, isPreview: options.mode === 'preview' };
}

export function renderPreview(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  const maxDim = options.previewMaxDimension ?? 640;
  const small = downscale(image, maxDim);
  return applyProcessingProfile(small, profile, { ...options, mode: 'preview' });
}

export function renderFullResolution(
  image: RGBAImage,
  profile: ProcessingProfile,
  options: ProcessOptions,
): ProcessResult {
  return applyProcessingProfile(image, profile, { ...options, mode: 'full' });
}
