/** Lens FX set 1 — stronger, clearly visible optical treatments */
import { clone, grade, teleCrop } from "./opt-core";
import { sharpen } from "./opt-warp";

export function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const soft = document.createElement("canvas");
  soft.width = src.width;
  soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(8px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";

  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(soft, 0, 0);

  const cx = c.width / 2;
  const cy = c.height * 0.4;
  const rx = Math.min(c.width, c.height) * 0.38;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, rx * 1.2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(src, 0, 0);
  ctx.restore();

  // Soft edge blend ring
  const ring = ctx.createRadialGradient(cx, cy, rx * 0.75, cx, cy, rx * 1.15);
  ring.addColorStop(0, "rgba(0,0,0,0)");
  ring.addColorStop(1, "rgba(0,0,0,0)");
  // vignette
  const vig = ctx.createRadialGradient(cx, cy, Math.min(c.width, c.height) * 0.25, cx, cy, Math.min(c.width, c.height) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, c.width, c.height);

  return grade(sharpen(c, 0.7), "contrast(1.18) saturate(1.12) brightness(1.04)");
}

export function dreamSoft(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(2.8px) brightness(1.08) saturate(1.2)";
  ctx.globalAlpha = 0.72;
  ctx.drawImage(src, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  // soft glow overlay
  ctx.filter = "blur(6px) brightness(1.15)";
  ctx.globalAlpha = 0.28;
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  return grade(c, "contrast(1.06) saturate(1.15)");
}

export function glowMist(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(5px) brightness(1.18)";
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  return grade(c, "contrast(1.12) saturate(1.28) brightness(1.06)");
}

export function vintage(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = grade(src, "sepia(0.45) contrast(1.18) brightness(1.06) saturate(0.85)");
  const ctx = c.getContext("2d")!;
  // warm center + edge falloff
  const cx = c.width / 2;
  const cy = c.height / 2;
  const vig = ctx.createRadialGradient(cx, cy, Math.min(c.width, c.height) * 0.2, cx, cy, Math.min(c.width, c.height) * 0.72);
  vig.addColorStop(0, "rgba(255,200,120,0.08)");
  vig.addColorStop(0.55, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(40,20,10,0.4)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

export function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // classic false-color IR: foliage bright pink/white, sky dark
    d[i] = Math.min(255, g * 1.25 + 30);
    d[i + 1] = Math.min(255, r * 0.55 + b * 0.35 + 10);
    d[i + 2] = Math.min(255, b * 0.4 + 15);
  }
  ctx.putImageData(img, 0, 0);
  return grade(c, "contrast(1.35) saturate(1.45) brightness(1.05)");
}

export function microReveal(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(sharpen(teleCrop(src, 2.2), 2.0), "contrast(1.28) saturate(1.1) brightness(1.03)");
}
