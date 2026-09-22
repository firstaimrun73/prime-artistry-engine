/**
 * Lightweight carousel lens effects (no FAL / no heavy models).
 * Face-dependent lenses consume shared on-device face-track landmarks.
 */
import { clone } from "./opt-core";
import { detectFaceLandmarksSync, type FaceLandmarks } from "./face-track";

function cssGrade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

/** Shared sync face landmarks (null = no face; callers must not leave stale overlays). */
function trackFace(src: HTMLCanvasElement): FaceLandmarks | null {
  return detectFaceLandmarksSync(src);
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
  const face = trackFace(src);
  if (!face || face.confidence < 0.2) return c;
  const crownX = face.headTop.x;
  const crownY = face.headTop.y;
  const crownSize = Math.max(22, face.scale * 0.72);
  ctx.save();
  ctx.translate(crownX, crownY);
  ctx.rotate(face.roll);
  ctx.translate(-crownX, -crownY);
  drawGoldCrown(ctx, crownX, crownY, crownSize);
  ctx.restore();
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
  // No whole-image blue tint — only local eye glow from tracked landmarks
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  if (!live) {
    const graded = cssGrade(src, "contrast(1.08) saturate(1.06) brightness(1.01)");
    ctx.drawImage(graded, 0, 0);
  } else {
    ctx.drawImage(src, 0, 0);
  }
  const face = trackFace(src);
  if (!face || face.confidence < 0.2) return c;
  const r = Math.max(8, face.scale * 0.12);
  for (const eye of [face.leftEye, face.rightEye]) {
    const g = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, r * 2.2);
    g.addColorStop(0, "rgba(100,220,255,0.75)");
    g.addColorStop(0.4, "rgba(40,160,255,0.35)");
    g.addColorStop(1, "rgba(0,80,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, r * 2.2, 0, Math.PI * 2);
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
  const face = trackFace(src);
  if (!face || face.confidence < 0.2) return c;
  // Hair region: above forehead to top of head, width ~ face scale
  const hairTop = Math.max(0, face.headTop.y - face.bounds.h * 0.15);
  const hairBot = face.forehead.y + face.bounds.h * 0.08;
  const hairLeft = Math.max(0, face.bounds.x - face.scale * 0.08);
  const hairRight = Math.min(c.width, face.bounds.x + face.bounds.w + face.scale * 0.08);
  const hairH = Math.max(4, hairBot - hairTop);
  const hairW = Math.max(4, hairRight - hairLeft);
  const overlay = document.createElement("canvas");
  overlay.width = c.width;
  overlay.height = c.height;
  const octx = overlay.getContext("2d")!;
  octx.drawImage(src, 0, 0);
  // Soft elliptical mask over hair zone only (not full-width band)
  octx.save();
  octx.beginPath();
  octx.ellipse(
    face.headTop.x,
    (hairTop + hairBot) * 0.5,
    hairW * 0.48,
    hairH * 0.55,
    face.roll,
    0,
    Math.PI * 2,
  );
  octx.clip();
  octx.globalCompositeOperation = "hue";
  octx.fillStyle = "rgba(140,60,200,0.9)";
  octx.fillRect(hairLeft, hairTop, hairW, hairH);
  octx.restore();
  ctx.globalAlpha = live ? 0.35 : 0.55;
  ctx.drawImage(overlay, 0, 0);
  ctx.globalAlpha = 1;
  return c;
}

export function applyButterfly(src: HTMLCanvasElement, _live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = trackFace(src);
  if (!face || face.confidence < 0.2) return c;
  const s0 = Math.max(10, face.scale * 0.16);
  const places: [number, number, number][] = [
    [face.headTop.x - face.scale * 0.28, face.headTop.y + face.bounds.h * 0.05, s0],
    [face.headTop.x + face.scale * 0.28, face.headTop.y + face.bounds.h * 0.08, s0 * 0.9],
    [face.headTop.x, face.headTop.y - face.scale * 0.06, s0 * 0.75],
  ];
  for (const [x, y, s] of places) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(face.roll);
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
