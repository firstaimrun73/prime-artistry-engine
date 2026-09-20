/** Lens FX set 2 — stronger, clearly visible optical treatments */
import { clone, grade, analyzeFocus, findHighlight, detectPrimaryFace } from "./opt-core";
import { sharpen, radialMap } from "./opt-warp";

/** Miniature / tilt-shift */
export function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const focus = analyzeFocus(src);
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const h = c.height;
  const w = c.width;
  const soft = document.createElement("canvas");
  soft.width = w;
  soft.height = h;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(11px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  ctx.drawImage(soft, 0, 0);
  const bandH = h * (0.28 + focus.strength * 0.1);
  const midY = h * Math.min(0.62, Math.max(0.28, focus.y));
  const y0 = midY - bandH / 2;
  const sharp = document.createElement("canvas");
  sharp.width = w;
  sharp.height = h;
  const shctx = sharp.getContext("2d")!;
  shctx.drawImage(src, 0, 0);
  const g = shctx.createLinearGradient(0, y0 - bandH * 0.35, 0, y0 + bandH * 1.35);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.22, "rgba(0,0,0,1)");
  g.addColorStop(0.78, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  shctx.globalCompositeOperation = "destination-in";
  shctx.fillStyle = g;
  shctx.fillRect(0, 0, w, h);
  shctx.globalCompositeOperation = "source-over";
  ctx.drawImage(sharp, 0, 0);
  return grade(sharpen(c, 1.15), "contrast(1.28) saturate(1.42) brightness(1.04)");
}

export function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(src, 6, 0);
  ctx.globalAlpha = 0.35;
  ctx.drawImage(src, -5, 2);
  ctx.globalAlpha = 0.3;
  ctx.drawImage(src, 2, -4);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "contrast(1.2) saturate(1.55) brightness(1.03)");
}

/** Starflare: content-responsive highlight-based flare */
export function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;
  const hi = findHighlight(src);
  if (hi.strength < 0.12) {
    return grade(c, "contrast(1.08) brightness(1.02) saturate(1.05)");
  }
  const fx = w * hi.x;
  const fy = h * hi.y;
  const radius = Math.min(w, h) * (0.18 + hi.strength * 0.32);
  const alpha = 0.25 + hi.strength * 0.5;
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, radius);
  g.addColorStop(0, `rgba(255,245,210,${alpha * 0.85})`);
  g.addColorStop(0.35, `rgba(255,200,100,${alpha * 0.4})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(fx, fy);
  ctx.strokeStyle = `rgba(255,240,200,${0.2 + hi.strength * 0.35})`;
  ctx.lineWidth = Math.max(1.2, Math.min(w, h) * 0.0035 * (0.7 + hi.strength));
  ctx.lineCap = "round";
  const streak = Math.min(w, h) * (0.12 + hi.strength * 0.16);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-streak, 0);
    ctx.lineTo(streak, 0);
    ctx.stroke();
  }
  ctx.restore();
  return grade(c, "contrast(1.12) brightness(1.05) saturate(1.08)");
}

export function radialBokeh(src: HTMLCanvasElement, strength = 1): HTMLCanvasElement {
  const focus = analyzeFocus(src);
  const soft = document.createElement("canvas");
  soft.width = src.width;
  soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = `blur(${5 + strength * 6}px)`;
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(soft, 0, 0);
  const cx = c.width * focus.x;
  const cy = c.height * focus.y;
  const r = Math.min(c.width, c.height) * (0.32 + focus.strength * 0.1);
  const subject = document.createElement("canvas");
  subject.width = c.width;
  subject.height = c.height;
  const sctx2 = subject.getContext("2d")!;
  sctx2.drawImage(src, 0, 0);
  const mask = sctx2.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.2);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.6, "rgba(0,0,0,0.75)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  sctx2.globalCompositeOperation = "destination-in";
  sctx2.fillStyle = mask;
  sctx2.fillRect(0, 0, c.width, c.height);
  sctx2.globalCompositeOperation = "source-over";
  ctx.drawImage(subject, 0, 0);
  return c;
}

export function architectAlign(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(sharpen(radialMap(src, 0.88), 1.2), "contrast(1.25) saturate(0.92) brightness(1.02)");
}

/** Official Sumo outfit/body board (face cutout). */
export const SUMO_OUTFIT_URL =
  "https://assets.motio2edit.com/samples/lenses/1000121190-removebg-preview.png";

let sumoBoardCache: HTMLCanvasElement | null = null;
let sumoHole: { cx: number; cy: number; rx: number; ry: number } | null = null;
let sumoLoadPromise: Promise<void> | null = null;

function loadImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("sumo asset load failed"));
    img.src = url;
  });
}

function findFaceHole(board: HTMLCanvasElement): { cx: number; cy: number; rx: number; ry: number } {
  const w = board.width;
  const h = board.height;
  const ctx = board.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, w, h);
  const step = Math.max(2, Math.floor(Math.min(w, h) / 80));
  let best = 0;
  let bx = w * 0.5;
  let by = h * 0.22;
  let br = Math.min(w, h) * 0.12;
  for (let cy = Math.floor(h * 0.08); cy < Math.floor(h * 0.55); cy += step) {
    for (let cx = Math.floor(w * 0.2); cx < Math.floor(w * 0.8); cx += step) {
      for (let r = Math.floor(Math.min(w, h) * 0.06); r < Math.floor(Math.min(w, h) * 0.22); r += step) {
        let open = 0;
        let total = 0;
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2;
          for (let rad = 0; rad < r; rad += step) {
            const x = Math.round(cx + Math.cos(ang) * rad);
            const y = Math.round(cy + Math.sin(ang) * rad * 1.15);
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            total++;
            const i = (y * w + x) * 4;
            if (data[i + 3] < 40) open++;
          }
        }
        const score = total > 10 ? open / total : 0;
        const areaScore = score * r * r;
        if (score > 0.55 && areaScore > best) {
          best = areaScore;
          bx = cx;
          by = cy;
          br = r;
        }
      }
    }
  }
  if (best < 1) {
    return { cx: w * 0.5, cy: h * 0.2, rx: w * 0.14, ry: h * 0.12 };
  }
  return { cx: bx, cy: by, rx: br * 1.05, ry: br * 1.2 };
}

/** Ensure Sumo board is loaded (call early when lens selected). */
export function ensureSumoBoard(): Promise<void> {
  if (sumoBoardCache) return Promise.resolve();
  if (sumoLoadPromise) return sumoLoadPromise;
  sumoLoadPromise = (async () => {
    const img = await loadImageEl(SUMO_OUTFIT_URL);
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    sumoBoardCache = c;
    sumoHole = findFaceHole(c);
  })();
  return sumoLoadPromise;
}

/**
 * Sumo AI+ cutout: user face fitted into the Sumo board face opening.
 */
export function sumoCutout(src: HTMLCanvasElement): HTMLCanvasElement {
  if (!sumoBoardCache || !sumoHole) {
    void ensureSumoBoard();
    return grade(src, "contrast(1.05) saturate(1.05)");
  }
  const face = detectPrimaryFace(src);
  const board = sumoBoardCache;
  const hole = sumoHole;
  const out = document.createElement("canvas");
  out.width = board.width;
  out.height = board.height;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let fx: number, fy: number, fw: number, fh: number;
  if (face && face.confidence > 0.12) {
    const padX = face.w * 0.18;
    const padY = face.h * 0.22;
    fx = face.x - padX;
    fy = face.y - padY;
    fw = face.w + padX * 2;
    fh = face.h + padY * 2;
  } else {
    fw = src.width * 0.42;
    fh = src.height * 0.42;
    fx = (src.width - fw) / 2;
    fy = src.height * 0.12;
  }
  fx = Math.max(0, fx);
  fy = Math.max(0, fy);
  fw = Math.min(fw, src.width - fx);
  fh = Math.min(fh, src.height - fy);

  const dx = hole.cx - hole.rx;
  const dy = hole.cy - hole.ry;
  const dw = hole.rx * 2;
  const dh = hole.ry * 2;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hole.cx, hole.cy, hole.rx * 1.02, hole.ry * 1.02, 0, 0, Math.PI * 2);
  ctx.clip();
  const srcAspect = fw / fh;
  const dstAspect = dw / dh;
  let sx = fx, sy = fy, sw = fw, sh = fh;
  if (srcAspect > dstAspect) {
    sw = fh * dstAspect;
    sx = fx + (fw - sw) / 2;
  } else {
    sh = fw / dstAspect;
    sy = fy + (fh - sh) / 2;
  }
  ctx.drawImage(src, sx, sy, sw, sh, dx - dw * 0.02, dy - dh * 0.02, dw * 1.04, dh * 1.04);
  ctx.restore();
  ctx.drawImage(board, 0, 0);
  return out;
}
