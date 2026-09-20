/** Lens FX set 2 — stronger, clearly visible optical treatments */
import { clone, grade, analyzeFocus, findHighlight } from "./opt-core";
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
