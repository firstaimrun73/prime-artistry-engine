/** Lens FX set 2 — stronger, clearly visible optical treatments */
import { clone, grade } from "./opt-core";
import { sharpen, radialMap } from "./opt-warp";

export function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const h = c.height;
  const soft = document.createElement("canvas");
  soft.width = c.width;
  soft.height = h;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(9px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";
  ctx.drawImage(soft, 0, 0);

  const band = h * 0.32;
  const y0 = h * 0.34;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, c.width, band);
  ctx.clip();
  ctx.drawImage(src, 0, 0);
  ctx.restore();

  // soft transition bands
  const fade = 0.08 * h;
  const g1 = ctx.createLinearGradient(0, y0 - fade, 0, y0 + fade);
  g1.addColorStop(0, "rgba(0,0,0,0)");
  g1.addColorStop(1, "rgba(0,0,0,0)");

  return grade(c, "contrast(1.22) saturate(1.35) brightness(1.04)");
}

export function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  // RGB channel split
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.45;
  ctx.drawImage(src, 6, 0); // red-ish offset via overdraw
  ctx.globalAlpha = 0.35;
  ctx.drawImage(src, -5, 2);
  ctx.globalAlpha = 0.3;
  ctx.drawImage(src, 2, -4);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "contrast(1.2) saturate(1.55) brightness(1.03)");
}

export function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;

  // main glow blob
  const g = ctx.createRadialGradient(w * 0.72, h * 0.22, 0, w * 0.72, h * 0.22, Math.min(w, h) * 0.42);
  g.addColorStop(0, "rgba(255,245,210,0.7)");
  g.addColorStop(0.35, "rgba(255,200,100,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // cross star streaks
  ctx.save();
  ctx.translate(w * 0.72, h * 0.22);
  ctx.strokeStyle = "rgba(255,240,200,0.45)";
  ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.004);
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-Math.min(w, h) * 0.22, 0);
    ctx.lineTo(Math.min(w, h) * 0.22, 0);
    ctx.stroke();
  }
  ctx.restore();

  return grade(c, "contrast(1.15) brightness(1.08) saturate(1.1)");
}

export function radialBokeh(src: HTMLCanvasElement, strength = 1): HTMLCanvasElement {
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

  const cx = c.width / 2;
  const cy = c.height / 2;
  const r = Math.min(c.width, c.height) * 0.32;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(src, 0, 0);
  ctx.restore();

  return grade(c, "contrast(1.14) saturate(1.1)");
}

export function architectAlign(src: HTMLCanvasElement): HTMLCanvasElement {
  // mild barrel correction + crisp lines
  return grade(sharpen(radialMap(src, 0.88), 1.2), "contrast(1.25) saturate(0.92) brightness(1.02)");
}
