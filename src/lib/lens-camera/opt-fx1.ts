/** Lens FX set 1 */
import { clone, grade, teleCrop } from "./opt-core";
import { sharpen } from "./opt-warp";

export function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const soft = document.createElement("canvas");
  soft.width = src.width; soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(4.5px)"; sctx.drawImage(src, 0, 0); sctx.filter = "none";
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(soft, 0, 0);
  const cx = c.width/2, cy = c.height*0.42, rx = Math.min(c.width,c.height)*0.32;
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,rx,rx*1.15,0,0,Math.PI*2); ctx.clip();
  ctx.drawImage(src, 0, 0); ctx.restore();
  return grade(sharpen(c, 0.5), "contrast(1.1) saturate(1.08) brightness(1.03)");
}
export function dreamSoft(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  ctx.filter = "blur(1.2px) brightness(1.05) saturate(1.1)";
  ctx.globalAlpha = 0.55; ctx.drawImage(src, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none";
  return c;
}
export function glowMist(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  ctx.filter = "blur(2.5px) brightness(1.12)"; ctx.globalAlpha = 0.4;
  ctx.drawImage(src, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none";
  return grade(c, "contrast(1.08) saturate(1.15)");
}
export function vintage(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(src, "sepia(0.35) contrast(1.1) brightness(1.05) saturate(0.9)");
}
export function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0,0,c.width,c.height), d = img.data;
  for (let i=0;i<d.length;i+=4) {
    const r=d[i],g=d[i+1],b=d[i+2];
    d[i]=Math.min(255,g*1.1+20); d[i+1]=Math.min(255,r*0.7+b*0.3); d[i+2]=Math.min(255,b*0.5);
  }
  ctx.putImageData(img,0,0);
  return grade(c, "contrast(1.25) saturate(1.3)");
}
export function microReveal(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(sharpen(teleCrop(src, 1.8), 1.5), "contrast(1.2) saturate(1.05)");
}
