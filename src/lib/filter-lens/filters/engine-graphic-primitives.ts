/**
 * engine-graphic-primitives.ts
 * Higher-level graphic primitives on engine-npr-core.
 */
import {
  ImgBuf,
  clampCoord,
  luma,
  sobelMagnitude,
  boxBlur,
} from './engine-npr-core';

function idx(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

/** Adaptive-threshold edge mask (0..1). */
export function adaptiveEdgeMask(
  img: ImgBuf,
  blockRadius: number,
  bias: number,
): Float32Array {
  const { width, height, data } = img;
  const grayImg: ImgBuf = {
    data: new Uint8ClampedArray(data.length),
    width,
    height,
  };
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i + 1], data[i + 2]);
    grayImg.data[i] = grayImg.data[i + 1] = grayImg.data[i + 2] = l;
    grayImg.data[i + 3] = 255;
  }
  const localMean = boxBlur(grayImg, Math.max(1, blockRadius));
  const mask = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const l = grayImg.data[i];
      const m = localMean.data[i];
      const diff = m - l - bias;
      mask[y * width + x] = diff > 0 ? Math.min(1, diff / 40) : 0;
    }
  }
  return mask;
}

/** Sobel ink mask scaled by strength. */
export function sobelInkMask(
  img: ImgBuf,
  strength: number,
  threshold: number,
): Float32Array {
  const mag = sobelMagnitude(img);
  const out = new Float32Array(mag.length);
  for (let i = 0; i < mag.length; i++) {
    const v = Math.max(0, mag[i] - threshold) / 255;
    out[i] = Math.min(1, v * strength);
  }
  return out;
}

/** Composite 0..1 ink mask toward inkColor. */
export function compositeInk(
  img: ImgBuf,
  mask: Float32Array,
  inkColor: [number, number, number] = [15, 15, 20],
): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    const m = mask[p];
    out[i] = data[i] + (inkColor[0] - data[i]) * m;
    out[i + 1] = data[i + 1] + (inkColor[1] - data[i + 1]) * m;
    out[i + 2] = data[i + 2] + (inkColor[2] - data[i + 2]) * m;
    out[i + 3] = data[i + 3];
  }
  return { data: out, width, height };
}

/** Cross-hatch for Sketch; strength 0..1. */
export function crossHatch(img: ImgBuf, strength: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data);
  if (strength <= 0) return { data: out, width, height };

  const spacing = Math.max(2, Math.round(6 - strength * 3));
  const darkThresh = 170 - strength * 60;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const l = luma(data[i], data[i + 1], data[i + 2]);
      if (l > darkThresh) continue;
      const darkness = 1 - l / darkThresh;
      const onDiag1 = (x + y) % spacing === 0;
      const onDiag2 = strength > 0.5 && (x - y + height) % spacing === 0;
      if (onDiag1 || onDiag2) {
        const amt = Math.min(1, darkness * strength * 1.4);
        out[i] = data[i] * (1 - amt);
        out[i + 1] = data[i + 1] * (1 - amt);
        out[i + 2] = data[i + 2] * (1 - amt);
      }
    }
  }
  return { data: out, width, height };
}

/** Soft color cells with blend back toward original. */
export function colorCells(img: ImgBuf, cellSize: number, blendAmt: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const cs = Math.max(2, cellSize | 0);
  const k = Math.max(0, Math.min(1, blendAmt));

  for (let by = 0; by < height; by += cs) {
    for (let bx = 0; bx < width; bx += cs) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      const yEnd = Math.min(height, by + cs);
      const xEnd = Math.min(width, bx + cs);
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = idx(x, y, width);
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }
      r /= count;
      g /= count;
      b /= count;
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = idx(x, y, width);
          out[i] = data[i] + (r - data[i]) * k;
          out[i + 1] = data[i + 1] + (g - data[i + 1]) * k;
          out[i + 2] = data[i + 2] + (b - data[i + 2]) * k;
          out[i + 3] = data[i + 3];
        }
      }
    }
  }
  return { data: out, width, height };
}

/** Halftone dots in shadows only. */
export function halftoneShadows(
  img: ImgBuf,
  dotSize: number,
  threshold: number,
  strength: number,
): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data);
  const ds = Math.max(2, dotSize | 0);
  const k = Math.max(0, Math.min(1, strength));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const l = luma(data[i], data[i + 1], data[i + 2]);
      if (l >= threshold) continue;
      const cx = Math.floor(x / ds) * ds + ds / 2;
      const cy = Math.floor(y / ds) * ds + ds / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const radius = (1 - l / threshold) * (ds / 2);
      if (dist < radius) {
        out[i] = data[i] * (1 - k);
        out[i + 1] = data[i + 1] * (1 - k);
        out[i + 2] = data[i + 2] * (1 - k);
      }
    }
  }
  return { data: out, width, height };
}

/** Local neon rim — magenta/cyan on edges only. */
export function neonRim(
  img: ImgBuf,
  strength: number,
  colorA: [number, number, number] = [255, 0, 200],
  colorB: [number, number, number] = [0, 220, 255],
): ImgBuf {
  const { width, height, data } = img;
  const mag = sobelMagnitude(img);
  const out = new Uint8ClampedArray(data);
  let maxMag = 1;
  for (let i = 0; i < mag.length; i++) if (mag[i] > maxMag) maxMag = mag[i];
  const k = Math.max(0, Math.min(1, strength));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const e = Math.min(1, mag[p] / (maxMag * 0.5));
      if (e < 0.05) continue;
      const i = idx(x, y, width);
      const useA = (x + y) % 2 === 0;
      const [cr, cg, cb] = useA ? colorA : colorB;
      const amt = e * k;
      out[i] = data[i] + (cr - data[i]) * amt;
      out[i + 1] = data[i + 1] + (cg - data[i + 1]) * amt;
      out[i + 2] = data[i + 2] + (cb - data[i + 2]) * amt;
    }
  }
  return { data: out, width, height };
}

/** Midtone darken for night feel. */
export function midtoneDarken(img: ImgBuf, amount: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c] / 255;
      const w = 4 * v * (1 - v);
      out[i + c] = data[i + c] * (1 - a * w * 0.6);
    }
    out[i + 3] = data[i + 3];
  }
  return { data: out, width, height };
}

/** Partial cyan-magenta-violet palette blend. */
export function cyberpunkPaletteBlend(img: ImgBuf, amount: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i + 1], data[i + 2]) / 255;
    let pr: number, pg: number, pb: number;
    if (l < 0.5) {
      const t = l / 0.5;
      pr = 60 + (220 - 60) * t;
      pg = 10 + (0 - 10) * t;
      pb = 90 + (170 - 90) * t;
    } else {
      const t = (l - 0.5) / 0.5;
      pr = 220 + (0 - 220) * t;
      pg = 0 + (220 - 0) * t;
      pb = 170 + (255 - 170) * t;
    }
    out[i] = data[i] + (pr - data[i]) * a;
    out[i + 1] = data[i + 1] + (pg - data[i + 1]) * a;
    out[i + 2] = data[i + 2] + (pb - data[i + 2]) * a;
    out[i + 3] = data[i + 3];
  }
  return { data: out, width, height };
}

/** Warm + green midtone lift (Ghibli storybook). */
export function warmGreenLift(img: ImgBuf, amount: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const a = Math.max(0, Math.min(1, amount));
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i + 1], data[i + 2]) / 255;
    const w = Math.sin(Math.PI * l);
    out[i] = Math.min(255, data[i] + 12 * a * w);
    out[i + 1] = Math.min(255, data[i + 1] + 10 * a * w);
    out[i + 2] = Math.max(0, data[i + 2] - 6 * a * w);
    out[i + 3] = data[i + 3];
  }
  return { data: out, width, height };
}

// Keep clampCoord export for any residual imports
export { clampCoord };
