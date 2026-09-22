/**
 * Lightweight carousel lens effects (no FAL / no heavy models).
 * Crown uses skin-tone face heuristic + gold crown on forehead.
 */
import { clone } from "./opt-core";

function cssGrade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

/** Largest skin-tone blob as approximate face box. */
function findFaceBox(src: HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
  const W = src.width;
  const H = src.height;
  if (W < 16 || H < 16) return null;
  const ctx = src.getContext("2d")!;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const cell = Math.max(4, Math.floor(Math.min(W, H) / 40));
  let bestScore = 0;
  let bx = 0, by = 0, bw = Math.floor(W * 0.28), bh = Math.floor(H * 0.32);
  for (let y = 0; y < H - cell; y += cell) {
    for (let x = 0; x < W - cell; x += cell) {
      let skin = 0, tot = 0;
      for (let dy = 0; dy < cell; dy += 2) {
        for (let dx = 0; dx < cell; dx += 2) {
          const i = ((y + dy) * W + (x + dx)) * 4;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          tot++;
          if (r > 60 && g > 30 && b > 15 && r > g && r > b && Math.abs(r - g) > 8) skin++;
        }
      }
      const score = skin / Math.max(1, tot);
      if (score > 0.35 && score > bestScore) {
        bestScore = score;
        bx = x; by = y; bw = cell * 6; bh = cell * 7;
      }
    }
  }
  if (bestScore < 0.35) {
    return { x: Math.floor(W * 0.32), y: Math.floor(H * 0.12), w: Math.floor(W * 0.36), h: Math.floor(H * 0.42) };
  }
  bx = Math.max(0, bx - Math.floor(bw * 0.3));
  by = Math.max(0, by - Math.floor(bh * 0.4));
  bw = Math.min(W - bx, Math.floor(bw * 1.6));
  bh = Math.min(H - by, Math.floor(bh * 1.5));
  return { x: bx, y: by, w: bw, h: bh };
}

function drawGoldCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = Math.max(12, size);
  ctx.save();
  ctx.translate(cx, cy);
  const pts: [number, number][] = [
    [-s * 0.55, s * 0.18], [-s * 0.4, -s * 0.05], [-s * 0.28, s * 0.08],
    [-s * 0.12, -s * 0.42], [0, s * 0.02], [s * 0.12, -s * 0.42],
    [s * 0.28, s * 0.08], [s * 0.4, -s * 0.05], [s * 0.55, s * 0.18],
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.3);
  grad.addColorStop(0, "#FFF3A0");
  grad.addColorStop(0.4, "#FFD700");
  grad.addColorStop(1, "#B8860B");
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(180,120,0,0.55)";
  ctx.shadowBlur = s * 0.18;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(120,80,0,0.55)";
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.stroke();
  ctx.fillStyle = "#E74C3C";
  ctx.beginPath();
  ctx.arc(0, -s * 0.12, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3498DB";
  ctx.beginPath();
  ctx.arc(-s * 0.28, s * 0.02, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.28, s * 0.02, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function applyCrown(src: HTMLCanvasElement, _live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = findFaceBox(src);
  if (!face) return c;
  const crownX = face.x + face.w * 0.5;
  const crownY = face.y + face.h * 0.08;
  const crownSize = Math.max(18, face.w * 0.55);
  drawGoldCrown(ctx, crownX, crownY, crownSize);
  return c;
}

export function applyVintageHalation(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  let c = cssGrade(src, live
    ? "sepia(0.28) contrast(1.08) brightness(1.04) saturate(0.9)"
    : "sepia(0.4) contrast(1.14) brightness(1.05) saturate(0.85)");
  const ctx = c.getContext("2d")!;
  const W = c.width, H = c.height;
  const soft = document.createElement("canvas");
  soft.width = W; soft.height = H;
  const sctx = soft.getContext("2d")!;
  sctx.filter = live ? "blur(8px)" : "blur(14px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "rgba(255,90,40,0.55)";
  sctx.fillRect(0, 0, W, H);
  sctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = live ? 0.28 : 0.42;
  ctx.drawImage(soft, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (!live) {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.min(W, H) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(40,15,5,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  return c;
}

export function applyColourNegativeFx(src: HTMLCanvasElement, _live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  ctx.putImageData(img, 0, 0);
  return cssGrade(c, "contrast(1.12) saturate(1.15) brightness(1.02)");
}

export function applyThunderEyes(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = cssGrade(src, live ? "contrast(1.1) saturate(1.15)" : "contrast(1.18) saturate(1.25) brightness(1.02)");
  const ctx = c.getContext("2d")!;
  const face = findFaceBox(src);
  if (!face) return c;
  const eyeY = face.y + face.h * 0.38;
  const eyeLX = face.x + face.w * 0.32;
  const eyeRX = face.x + face.w * 0.68;
  const r = Math.max(8, face.w * 0.14);
  for (const ex of [eyeLX, eyeRX]) {
    const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, r * 2.2);
    g.addColorStop(0, "rgba(100,220,255,0.75)");
    g.addColorStop(0.4, "rgba(40,160,255,0.35)");
    g.addColorStop(1, "rgba(0,80,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ex, eyeY, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function applyRetro80sFx(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  return cssGrade(src, live
    ? "sepia(0.25) hue-rotate(-15deg) saturate(1.35) contrast(1.08)"
    : "sepia(0.35) hue-rotate(-18deg) saturate(1.45) contrast(1.12) brightness(1.02)");
}

export function applyHairShades(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = findFaceBox(src);
  if (!face) return cssGrade(c, "hue-rotate(25deg) saturate(1.2)");
  const bandY = Math.max(0, face.y - face.h * 0.15);
  const bandH = face.h * 0.45;
  const overlay = document.createElement("canvas");
  overlay.width = c.width; overlay.height = c.height;
  const octx = overlay.getContext("2d")!;
  octx.drawImage(src, 0, 0);
  octx.globalCompositeOperation = "hue";
  octx.fillStyle = "rgba(140,60,200,0.85)";
  octx.fillRect(0, bandY, c.width, bandH);
  octx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = live ? 0.35 : 0.55;
  ctx.drawImage(overlay, 0, 0);
  ctx.globalAlpha = 1;
  return c;
}

export function applyButterfly(src: HTMLCanvasElement, _live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = findFaceBox(src);
  const places: [number, number, number][] = face
    ? [
        [face.x + face.w * 0.15, face.y + face.h * 0.1, face.w * 0.18],
        [face.x + face.w * 0.85, face.y + face.h * 0.15, face.w * 0.16],
        [face.x + face.w * 0.5, face.y - face.h * 0.05, face.w * 0.14],
      ]
    : [
        [c.width * 0.25, c.height * 0.2, c.width * 0.08],
        [c.width * 0.75, c.height * 0.25, c.width * 0.07],
      ];
  for (const [x, y, s] of places) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,105,180,0.85)";
    ctx.beginPath();
    ctx.ellipse(-s * 0.35, 0, s * 0.4, s * 0.25, -0.4, 0, Math.PI * 2);
    ctx.ellipse(s * 0.35, 0, s * 0.4, s * 0.25, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(80,40,120,0.9)";
    ctx.fillRect(-s * 0.04, -s * 0.2, s * 0.08, s * 0.4);
    ctx.restore();
  }
  return c;
}

export function applyFairytale(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  let c = cssGrade(src, live
    ? "saturate(1.15) brightness(1.06) contrast(0.96)"
    : "saturate(1.22) brightness(1.08) contrast(0.94)");
  const ctx = c.getContext("2d")!;
  const W = c.width, H = c.height;
  const soft = document.createElement("canvas");
  soft.width = W; soft.height = H;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(2px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  sctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.35;
  ctx.drawImage(soft, 0, 0);
  ctx.globalAlpha = 1;
  if (!live) {
    ctx.strokeStyle = "rgba(255,200,220,0.35)";
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.008);
    ctx.strokeRect(W * 0.03, H * 0.03, W * 0.94, H * 0.94);
  }
  return c;
}

export function applyCrayon(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const levels = live ? 6 : 5;
  const step = 255 / levels;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  ctx.putImageData(img, 0, 0);
  if (!live) {
    ctx.filter = "contrast(1.15)";
    ctx.drawImage(c, 0, 0);
    ctx.filter = "none";
  }
  return cssGrade(c, "saturate(1.2) contrast(1.08)");
}

export function applyCarouselLens(src: HTMLCanvasElement, lensId: string, live = false): HTMLCanvasElement {
  switch (lensId) {
    case "lens_crown": return applyCrown(src, live);
    case "lens_vintage_halation": return applyVintageHalation(src, live);
    case "lens_colour_negative": return applyColourNegativeFx(src, live);
    case "lens_thunder_eyes": return applyThunderEyes(src, live);
    case "lens_retro_80s": return applyRetro80sFx(src, live);
    case "lens_hair_shades": return applyHairShades(src, live);
    case "lens_butterfly": return applyButterfly(src, live);
    case "lens_fairytale": return applyFairytale(src, live);
    case "lens_crayon": return applyCrayon(src, live);
    default: return src;
  }
}
