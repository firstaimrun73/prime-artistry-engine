/**
 * Lightweight carousel lens effects (no FAL / no heavy models).
 * Face-dependent lenses consume shared on-device face-track landmarks.
 * Landmarks from face-track are NORMALIZED (0–1); convert to pixels here.
 */
import { clone } from "./opt-core";
import {
  detectFaceLandmarksSync,
  ensureFaceLandmarker,
  type FaceLandmarks,
} from "./face-track";

function cssGrade(src: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return c;
}

/** Shared face landmarks — prefers MediaPipe once ready; null = no face. */
function trackFace(src: HTMLCanvasElement): FaceLandmarks | null {
  void ensureFaceLandmarker();
  return detectFaceLandmarksSync(src);
}

/** Convert normalized landmark point → canvas pixels. */
function px(p: { x: number; y: number }, W: number, H: number) {
  return { x: p.x * W, y: p.y * H };
}

/** Approximate face width in pixels from inter-eye distance. */
function faceWidthPx(face: FaceLandmarks, W: number, H: number): number {
  const lx = face.leftEye.x * W;
  const ly = face.leftEye.y * H;
  const rx = face.rightEye.x * W;
  const ry = face.rightEye.y * H;
  const eyeDist = Math.hypot(rx - lx, ry - ly) || W * 0.12;
  return eyeDist * 2.4;
}

/* ─── Crown ─────────────────────────────────────────────── */

function drawGoldCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = Math.max(18, size);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(-s * 0.58, s * 0.22);
  ctx.lineTo(-s * 0.58, s * 0.08);
  ctx.lineTo(s * 0.58, s * 0.08);
  ctx.lineTo(s * 0.58, s * 0.22);
  ctx.closePath();
  const band = ctx.createLinearGradient(0, s * 0.08, 0, s * 0.22);
  band.addColorStop(0, "#FFE566");
  band.addColorStop(0.5, "#FFD700");
  band.addColorStop(1, "#B8860B");
  ctx.fillStyle = band;
  ctx.shadowColor = "rgba(180,120,0,0.5)";
  ctx.shadowBlur = s * 0.12;
  ctx.fill();
  const peaks: [number, number][] = [
    [-s * 0.55, s * 0.08],
    [-s * 0.38, -s * 0.08],
    [-s * 0.28, s * 0.06],
    [-s * 0.12, -s * 0.48],
    [0, s * 0.02],
    [s * 0.12, -s * 0.48],
    [s * 0.28, s * 0.06],
    [s * 0.38, -s * 0.08],
    [s * 0.55, s * 0.08],
  ];
  ctx.beginPath();
  ctx.moveTo(peaks[0][0], peaks[0][1]);
  for (let i = 1; i < peaks.length; i++) ctx.lineTo(peaks[i][0], peaks[i][1]);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.15);
  grad.addColorStop(0, "#FFF8C0");
  grad.addColorStop(0.35, "#FFD700");
  grad.addColorStop(1, "#C9A227");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(120,80,0,0.55)";
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.stroke();
  const jewels: [number, string, number][] = [
    [0, "#E74C3C", 0.08],
    [-s * 0.3, "#3498DB", 0.055],
    [s * 0.3, "#2ECC71", 0.055],
  ];
  for (const [jx, color, jr] of jewels) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(jx, -s * 0.06, s * jr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function applyCrown(src: HTMLCanvasElement, _live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = trackFace(src);
  if (!face || face.confidence < 0.15) return c;
  const W = c.width;
  const H = c.height;
  const ht = px(face.headTop, W, H);
  const fw = faceWidthPx(face, W, H);
  const crownSize = Math.max(28, fw * 0.52);
  const crownY = ht.y - crownSize * 0.05;
  ctx.save();
  ctx.translate(ht.x, crownY);
  ctx.rotate(face.roll);
  ctx.translate(-ht.x, -crownY);
  drawGoldCrown(ctx, ht.x, crownY, crownSize);
  ctx.restore();
  return c;
}

/* ─── Vintage Halation ──────────────────────────────────── */

export function applyVintageHalation(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  let c = cssGrade(
    src,
    live
      ? "sepia(0.22) contrast(1.1) brightness(1.03) saturate(0.92)"
      : "sepia(0.32) contrast(1.16) brightness(1.04) saturate(0.88)",
  );
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const soft = document.createElement("canvas");
  soft.width = W;
  soft.height = H;
  const sctx = soft.getContext("2d")!;
  sctx.filter = live ? "blur(10px)" : "blur(16px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "rgba(255,70,25,0.6)";
  sctx.fillRect(0, 0, W, H);
  sctx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = live ? 0.3 : 0.45;
  ctx.drawImage(soft, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (!live) {
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.7));
    }
    ctx.putImageData(img, 0, 0);
  }
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.28,
    W / 2, H / 2, Math.min(W, H) * 0.78,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(35,12,4,0.48)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  return c;
}

/* ─── Colour Negative ───────────────────────────────────── */

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
  return cssGrade(c, "contrast(1.14) saturate(1.18) brightness(1.03)");
}

/* ─── Thunder Eyes (GOLD) ───────────────────────────────── */

export function applyThunderEyes(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  if (!live) {
    ctx.drawImage(cssGrade(src, "contrast(1.06) saturate(1.04) brightness(1.01)"), 0, 0);
  } else {
    ctx.drawImage(src, 0, 0);
  }
  const face = trackFace(src);
  if (!face || face.confidence < 0.15) return c;
  const W = c.width;
  const H = c.height;
  const fw = faceWidthPx(face, W, H);
  const r = Math.max(10, fw * 0.09);
  for (const eyeN of [face.leftEye, face.rightEye]) {
    const eye = px(eyeN, W, H);
    const g = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, r * 2.4);
    g.addColorStop(0, "rgba(255,230,120,0.85)");
    g.addColorStop(0.35, "rgba(255,180,40,0.4)");
    g.addColorStop(0.7, "rgba(255,140,20,0.15)");
    g.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (!live) {
      ctx.strokeStyle = "rgba(255,220,80,0.75)";
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.lineCap = "round";
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2 + face.roll;
        const x2 = eye.x + Math.cos(ang) * r * 1.9;
        const y2 = eye.y + Math.sin(ang) * r * 1.9;
        const mx = eye.x + Math.cos(ang + 0.15) * r * 0.9;
        const my = eye.y + Math.sin(ang + 0.15) * r * 0.9;
        ctx.beginPath();
        ctx.moveTo(eye.x, eye.y);
        ctx.lineTo(mx, my);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }
  return c;
}

/* ─── Retro 80s ─────────────────────────────────────────── */

export function applyRetro80sFx(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  let c = cssGrade(
    src,
    live
      ? "sepia(0.18) hue-rotate(-22deg) saturate(1.4) contrast(1.1) brightness(1.02)"
      : "sepia(0.28) hue-rotate(-28deg) saturate(1.55) contrast(1.14) brightness(1.03)",
  );
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "rgba(180,40,160,0.28)");
  sky.addColorStop(0.45, "rgba(255,90,60,0.18)");
  sky.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.55);
  const sunR = Math.min(W, H) * (live ? 0.12 : 0.16);
  const sunX = W * 0.5;
  const sunY = H * 0.22;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sun.addColorStop(0, "rgba(255,220,100,0.55)");
  sun.addColorStop(0.5, "rgba(255,120,60,0.25)");
  sun.addColorStop(1, "rgba(255,60,100,0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  if (!live) {
    ctx.strokeStyle = "rgba(255,80,180,0.35)";
    ctx.lineWidth = Math.max(1, H * 0.002);
    const gridTop = H * 0.62;
    for (let i = 0; i < 8; i++) {
      const y = gridTop + i * ((H - gridTop) / 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * W * 0.04, gridTop);
      ctx.lineTo(W / 2 + i * W * 0.18, H);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "rgba(180,60,20,0.35)";
    const edge = Math.max(3, W * 0.012);
    ctx.fillRect(0, 0, edge, H);
    ctx.fillRect(W - edge, 0, edge, H);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 16) {
      const n = (Math.random() - 0.5) * 12;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }
  return c;
}

/* ─── Hair Shades ───────────────────────────────────────── */

export function applyHairShades(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = trackFace(src);
  if (!face || face.confidence < 0.15) return c;
  const W = c.width;
  const H = c.height;
  const ht = px(face.headTop, W, H);
  const le = px(face.leftEye, W, H);
  const re = px(face.rightEye, W, H);
  const fw = faceWidthPx(face, W, H);
  const midEyeY = (le.y + re.y) * 0.5;
  const hairTop = Math.max(0, ht.y - fw * 0.35);
  const hairBot = midEyeY - fw * 0.05;
  const hairCx = ht.x;
  const hairCy = (hairTop + hairBot) * 0.5;
  const hairRx = fw * 0.55;
  const hairRy = Math.max(8, (hairBot - hairTop) * 0.55);

  const overlay = document.createElement("canvas");
  overlay.width = W;
  overlay.height = H;
  const octx = overlay.getContext("2d")!;
  octx.drawImage(src, 0, 0);
  octx.save();
  octx.beginPath();
  octx.ellipse(hairCx, hairCy, hairRx, hairRy, face.roll, 0, Math.PI * 2);
  octx.clip();
  octx.globalCompositeOperation = "hue";
  octx.fillStyle = "rgba(130,50,200,1)";
  octx.fillRect(0, 0, W, H);
  octx.globalCompositeOperation = "source-over";
  octx.globalAlpha = live ? 0.28 : 0.45;
  octx.fillStyle = "rgba(90,30,140,0.5)";
  octx.fillRect(0, 0, W, H);
  octx.restore();

  ctx.globalAlpha = live ? 0.55 : 0.75;
  ctx.drawImage(overlay, 0, 0);
  ctx.globalAlpha = 1;
  return c;
}

/* ─── Butterfly (ONE realistic) ─────────────────────────── */

function drawWing(ctx: CanvasRenderingContext2D, s: number) {
  const ug = ctx.createRadialGradient(s * 0.25, -s * 0.15, 0, s * 0.3, -s * 0.1, s * 0.55);
  ug.addColorStop(0, "#FF8DC7");
  ug.addColorStop(0.4, "#E040A0");
  ug.addColorStop(0.75, "#8B1A6B");
  ug.addColorStop(1, "#4A0A3A");
  ctx.fillStyle = ug;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 0.15, -s * 0.55, s * 0.55, -s * 0.5, s * 0.6, -s * 0.15);
  ctx.bezierCurveTo(s * 0.55, s * 0.05, s * 0.2, s * 0.08, 0, 0);
  ctx.closePath();
  ctx.fill();
  const lg = ctx.createRadialGradient(s * 0.2, s * 0.2, 0, s * 0.25, s * 0.25, s * 0.45);
  lg.addColorStop(0, "#FFB0D8");
  lg.addColorStop(0.5, "#C03090");
  lg.addColorStop(1, "#5A1040");
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 0.1, s * 0.15, s * 0.4, s * 0.5, s * 0.45, s * 0.35);
  ctx.bezierCurveTo(s * 0.35, s * 0.15, s * 0.12, s * 0.05, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(40,10,30,0.45)";
  ctx.lineWidth = Math.max(0.8, s * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.45, -s * 0.3);
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.35, s * 0.28);
  ctx.moveTo(s * 0.15, -s * 0.1);
  ctx.lineTo(s * 0.5, -s * 0.05);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,240,180,0.7)";
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.22, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20,10,40,0.6)";
  ctx.beginPath();
  ctx.arc(s * 0.38, -s * 0.22, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function drawRealisticButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  roll: number,
  flap: number,
) {
  const s = Math.max(14, size);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll);
  const wingOpen = 0.75 + 0.25 * Math.cos(flap);
  ctx.save();
  ctx.scale(-wingOpen, 1);
  drawWing(ctx, s);
  ctx.restore();
  ctx.save();
  ctx.scale(wingOpen, 1);
  drawWing(ctx, s);
  ctx.restore();
  ctx.fillStyle = "#2C1810";
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.08, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5A3A20";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.12, s * 0.06, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2C1810";
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.35);
  ctx.quadraticCurveTo(-s * 0.12, -s * 0.55, -s * 0.18, -s * 0.62);
  ctx.moveTo(0, -s * 0.35);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.55, s * 0.18, -s * 0.62);
  ctx.stroke();
  ctx.fillStyle = "#1A1008";
  ctx.beginPath();
  ctx.arc(-s * 0.18, -s * 0.62, s * 0.035, 0, Math.PI * 2);
  ctx.arc(s * 0.18, -s * 0.62, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function applyButterfly(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const face = trackFace(src);
  if (!face || face.confidence < 0.15) return c;
  const W = c.width;
  const H = c.height;
  const ht = px(face.headTop, W, H);
  const fw = faceWidthPx(face, W, H);
  const size = Math.max(20, fw * 0.28);
  const bx = ht.x + fw * 0.22;
  const by = ht.y + fw * 0.08;
  const flap = live ? (Date.now() / 180) % (Math.PI * 2) : 0.4;
  drawRealisticButterfly(ctx, bx, by, size, face.roll * 0.3, flap);
  return c;
}

/* ─── Fairytale (flat hand-drawn) ────────────────────────── */

export function applyFairytale(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const levels = live ? 5 : 4;
  const step = 255 / levels;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
  }
  ctx.putImageData(img, 0, 0);
  let out = cssGrade(c, live ? "saturate(1.35) contrast(1.08)" : "saturate(1.5) contrast(1.12)");
  if (!live) {
    const octx = out.getContext("2d")!;
    const blur = document.createElement("canvas");
    blur.width = W;
    blur.height = H;
    const bctx = blur.getContext("2d")!;
    bctx.filter = "blur(1.5px)";
    bctx.drawImage(src, 0, 0);
    bctx.filter = "none";
    const sharp = octx.getImageData(0, 0, W, H);
    const soft = bctx.getImageData(0, 0, W, H);
    const sd = sharp.data;
    const softd = soft.data;
    for (let i = 0; i < sd.length; i += 4) {
      const diff =
        Math.abs(sd[i] - softd[i]) +
        Math.abs(sd[i + 1] - softd[i + 1]) +
        Math.abs(sd[i + 2] - softd[i + 2]);
      if (diff > 40) {
        sd[i] = Math.min(sd[i], 30);
        sd[i + 1] = Math.min(sd[i + 1], 25);
        sd[i + 2] = Math.min(sd[i + 2], 25);
      }
    }
    octx.putImageData(sharp, 0, 0);
  }
  return out;
}

/* ─── Crayon ────────────────────────────────────────────── */

export function applyCrayon(src: HTMLCanvasElement, live = false): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const img = ctx.getImageData(0, 0, W, H);
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
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#3A2A1A";
    ctx.lineWidth = 1;
    const spacing = Math.max(4, Math.round(Math.min(W, H) * 0.012));
    for (let x = -H; x < W + H; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
    }
    ctx.restore();
    const grain = ctx.getImageData(0, 0, W, H);
    const gd = grain.data;
    for (let i = 0; i < gd.length; i += 8) {
      const n = (Math.random() - 0.5) * 22;
      gd[i] = Math.min(255, Math.max(0, gd[i] + n));
      gd[i + 1] = Math.min(255, Math.max(0, gd[i + 1] + n));
      gd[i + 2] = Math.min(255, Math.max(0, gd[i + 2] + n));
    }
    ctx.putImageData(grain, 0, 0);
  }
  return cssGrade(c, "saturate(1.25) contrast(1.1)");
}

/* ─── Router ────────────────────────────────────────────── */

export function applyCarouselLens(
  src: HTMLCanvasElement,
  lensId: string,
  live = false,
): HTMLCanvasElement {
  switch (lensId) {
    case "lens_crown":
      return applyCrown(src, live);
    case "lens_vintage_halation":
      return applyVintageHalation(src, live);
    case "lens_colour_negative":
      return applyColourNegativeFx(src, live);
    case "lens_thunder_eyes":
      return applyThunderEyes(src, live);
    case "lens_retro_80s":
      return applyRetro80sFx(src, live);
    case "lens_hair_shades":
      return applyHairShades(src, live);
    case "lens_butterfly":
      return applyButterfly(src, live);
    case "lens_fairytale":
      return applyFairytale(src, live);
    case "lens_crayon":
      return applyCrayon(src, live);
    default:
      return src;
  }
}
