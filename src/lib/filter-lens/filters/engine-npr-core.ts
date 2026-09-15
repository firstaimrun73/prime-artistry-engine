/**
 * engine-npr-core.ts
 * Core NPR primitives: stats, blur, bilateral, oil paint, soft quantize+dither.
 * ImgBuf-based pure functions (immutable out).
 */

export interface ImgBuf {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ImageStats {
  meanLuma: number;
  edgeDensity: number;
  lowContrast: boolean;
}

function idx(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

export function clampCoord(v: number, max: number): number {
  return v < 0 ? 0 : v > max ? max : v;
}

export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Sobel gradient magnitude, one value per pixel. */
export function sobelMagnitude(img: ImgBuf): Float32Array {
  const { data, width, height } = img;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = luma(data[i], data[i + 1], data[i + 2]);
  }
  const mag = new Float32Array(width * height);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0,
        sy = 0,
        k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const v = gray[(y + dy) * width + (x + dx)];
          sx += v * gx[k];
          sy += v * gy[k];
          k++;
        }
      }
      mag[y * width + x] = Math.sqrt(sx * sx + sy * sy);
    }
  }
  return mag;
}

/** Cheap adaptive stats used to drive every style recipe. */
export function computeImageStats(img: ImgBuf): ImageStats {
  const { data, width, height } = img;
  let sumLuma = 0;
  let minL = 255,
    maxL = 0;
  const n = width * height;
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i + 1], data[i + 2]);
    sumLuma += l;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }
  const meanLuma = sumLuma / n;
  const mag = sobelMagnitude(img);
  const edgeThresh = 40;
  let edgePixels = 0;
  for (let i = 0; i < mag.length; i++) {
    if (mag[i] > edgeThresh) edgePixels++;
  }
  const edgeDensity = edgePixels / n;
  const lowContrast = maxL - minL < 60;
  return { meanLuma, edgeDensity, lowContrast };
}

/** Separable box blur. */
export function boxBlur(img: ImgBuf, radius: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const tmp = new Float32Array(data.length);
  const r = Math.max(1, radius | 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rr = 0,
        gg = 0,
        bb = 0,
        aa = 0,
        count = 0;
      for (let dx = -r; dx <= r; dx++) {
        const xx = clampCoord(x + dx, width - 1);
        const i = idx(xx, y, width);
        rr += data[i];
        gg += data[i + 1];
        bb += data[i + 2];
        aa += data[i + 3];
        count++;
      }
      const o = idx(x, y, width);
      tmp[o] = rr / count;
      tmp[o + 1] = gg / count;
      tmp[o + 2] = bb / count;
      tmp[o + 3] = aa / count;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let rr = 0,
        gg = 0,
        bb = 0,
        aa = 0,
        count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = clampCoord(y + dy, height - 1);
        const i = idx(x, yy, width);
        rr += tmp[i];
        gg += tmp[i + 1];
        bb += tmp[i + 2];
        aa += tmp[i + 3];
        count++;
      }
      const o = idx(x, y, width);
      out[o] = rr / count;
      out[o + 1] = gg / count;
      out[o + 2] = bb / count;
      out[o + 3] = aa / count;
    }
  }
  return { data: out, width, height };
}

/** Approximate bilateral filter: edge-preserving smooth. */
export function bilateralApprox(img: ImgBuf, radius: number, sigmaColor: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const r = Math.max(1, Math.min(4, radius | 0));
  const twoSigmaColorSq = 2 * Math.max(8, sigmaColor) * Math.max(8, sigmaColor);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ci = idx(x, y, width);
      const cr = data[ci],
        cg = data[ci + 1],
        cb = data[ci + 2];
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        sumW = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = clampCoord(y + dy, height - 1);
        for (let dx = -r; dx <= r; dx++) {
          const xx = clampCoord(x + dx, width - 1);
          const ni = idx(xx, yy, width);
          const nr = data[ni],
            ng = data[ni + 1],
            nb = data[ni + 2];
          const colorDistSq =
            (nr - cr) * (nr - cr) + (ng - cg) * (ng - cg) + (nb - cb) * (nb - cb);
          const spatialDistSq = dx * dx + dy * dy;
          const w = Math.exp(
            -spatialDistSq / (2 * r * r + 1) - colorDistSq / twoSigmaColorSq,
          );
          sumR += nr * w;
          sumG += ng * w;
          sumB += nb * w;
          sumW += w;
        }
      }
      out[ci] = sumR / sumW;
      out[ci + 1] = sumG / sumW;
      out[ci + 2] = sumB / sumW;
      out[ci + 3] = data[ci + 3];
    }
  }
  return { data: out, width, height };
}

/**
 * Classic intensity-binned oil paint. Processes EVERY pixel — no step-and-fill.
 */
export function oilPaint(img: ImgBuf, radius: number, levels: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const r = Math.max(1, Math.min(5, radius | 0));
  const lv = Math.max(4, Math.min(16, levels | 0));
  const levelScale = (lv - 1) / 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const binCount = new Int32Array(lv);
      const binR = new Float64Array(lv);
      const binG = new Float64Array(lv);
      const binB = new Float64Array(lv);

      for (let dy = -r; dy <= r; dy++) {
        const yy = clampCoord(y + dy, height - 1);
        for (let dx = -r; dx <= r; dx++) {
          const xx = clampCoord(x + dx, width - 1);
          const i = idx(xx, yy, width);
          const rr = data[i],
            gg = data[i + 1],
            bb = data[i + 2];
          const l = luma(rr, gg, bb);
          const bin = Math.min(lv - 1, Math.max(0, Math.round(l * levelScale)));
          binCount[bin]++;
          binR[bin] += rr;
          binG[bin] += gg;
          binB[bin] += bb;
        }
      }

      let bestBin = 0,
        bestCount = -1;
      for (let bi = 0; bi < lv; bi++) {
        if (binCount[bi] > bestCount) {
          bestCount = binCount[bi];
          bestBin = bi;
        }
      }
      const o = idx(x, y, width);
      out[o] = binR[bestBin] / bestCount;
      out[o + 1] = binG[bestBin] / bestCount;
      out[o + 2] = binB[bestBin] / bestCount;
      out[o + 3] = data[o + 3];
    }
  }
  return { data: out, width, height };
}

/** Soft quantize with Bayer dither — reduces ring banding / color crush. */
export function softQuantize(img: ImgBuf, levels: number, ditherAmount: number): ImgBuf {
  const { width, height, data } = img;
  const out = new Uint8ClampedArray(data.length);
  const lv = Math.max(4, levels);
  const step = 255 / (lv - 1);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
    (v) => v / 16 - 0.5,
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      const d = bayer[(y % 4) * 4 + (x % 4)] * step * ditherAmount;
      for (let c = 0; c < 3; c++) {
        const v = data[i + c] + d;
        out[i + c] = Math.round(v / step) * step;
      }
      out[i + 3] = data[i + 3];
    }
  }
  return { data: out, width, height };
}

/** Blend two buffers by t (0 = a, 1 = b). */
export function blend(a: ImgBuf, b: ImgBuf, t: number): ImgBuf {
  const out = new Uint8ClampedArray(a.data.length);
  const k = Math.max(0, Math.min(1, t));
  for (let i = 0; i < a.data.length; i += 4) {
    out[i] = a.data[i] + (b.data[i] - a.data[i]) * k;
    out[i + 1] = a.data[i + 1] + (b.data[i + 1] - a.data[i + 1]) * k;
    out[i + 2] = a.data[i + 2] + (b.data[i + 2] - a.data[i + 2]) * k;
    out[i + 3] = a.data[i + 3];
  }
  return { data: out, width: a.width, height: a.height };
}
