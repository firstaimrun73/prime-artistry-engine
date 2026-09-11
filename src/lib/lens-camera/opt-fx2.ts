/** Lens FX set 2 */
import { clone, grade } from "./opt-core";
import { sharpen, radialMap } from "./opt-warp";

export function tiltShift(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  const h = c.height;
  const soft = document.createElement("canvas");
  soft.width = c.width; soft.height = h;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(5px)"; sctx.drawImage(src, 0, 0); sctx.filter = "none";
  ctx.drawImage(soft, 0, 0);
  const band = h * 0.28;
  const y0 = h * 0.36;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, c.width, band);
  ctx.clip();
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  return grade(c, "contrast(1.15) saturate(1.2)");
}
export function prismEcho(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.35;
  ctx.drawImage(src, 4, 0);
  ctx.globalAlpha = 0.25;
  ctx.drawImage(src, -3, 1);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return grade(c, "contrast(1.12) saturate(1.35)");
}
export function starflare(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  const w = c.width, h = c.height;
  const g = ctx.createRadialGradient(w*0.7, h*0.25, 0, w*0.7, h*0.25, Math.min(w,h)*0.35);
  g.addColorStop(0, "rgba(255,240,200,0.55)");
  g.addColorStop(0.4, "rgba(255,200,120,0.2)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
  return grade(c, "contrast(1.1) brightness(1.05)");
}
export function radialBokeh(src: HTMLCanvasElement, strength = 0.8): HTMLCanvasElement {
  const soft = document.createElement("canvas");
  soft.width = src.width; soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = `blur(${3 + strength * 4}px)`; sctx.drawImage(src, 0, 0); sctx.filter = "none";
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(soft, 0, 0);
  const cx = c.width/2, cy = c.height/2, r = Math.min(c.width,c.height)*0.28;
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
  ctx.drawImage(src, 0, 0); ctx.restore();
  return grade(c, "contrast(1.08)");
}
export function architectAlign(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(sharpen(radialMap(src, 0.92), 0.8), "contrast(1.18) saturate(0.95)");
}
