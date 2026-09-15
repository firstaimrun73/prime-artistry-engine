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

  const vig = ctx.createRadialGradient(
    cx,
    cy,
    Math.min(c.width, c.height) * 0.25,
    cx,
    cy,
    Math.min(c.width, c.height) * 0.75,
  );
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
  const cx = c.width / 2;
  const cy = c.height / 2;
  const vig = ctx.createRadialGradient(
    cx,
    cy,
    Math.min(c.width, c.height) * 0.2,
    cx,
    cy,
    Math.min(c.width, c.height) * 0.72,
  );
  vig.addColorStop(0, "rgba(255,200,120,0.08)");
  vig.addColorStop(0.55, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(40,20,10,0.4)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Strong false-color infrared — pink/white vegetation, dark cool sky */
export function infrared(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    // greens / bright foliage → hot pink-white
    // blues / sky → deep indigo
    // skin / midtones → magenta-rose
    const greenness = Math.max(0, g - Math.max(r, b));
    const blueness = Math.max(0, b - Math.max(r, g) * 0.85);
    let nr = r;
    let ng = g;
    let nb = b;
    if (greenness > 12 || (g > r + 8 && g > b + 8)) {
      nr = Math.min(255, luma * 1.35 + 70);
      ng = Math.min(255, luma * 0.55 + 20);
      nb = Math.min(255, luma * 0.75 + 40);
    } else if (blueness > 15 || b > r + 20) {
      nr = Math.min(255, luma * 0.25);
      ng = Math.min(255, luma * 0.35 + 10);
      nb = Math.min(255, luma * 0.55 + 25);
    } else {
      nr = Math.min(255, g * 1.15 + r * 0.35 + 25);
      ng = Math.min(255, r * 0.45 + b * 0.35 + 8);
      nb = Math.min(255, b * 0.55 + 20);
    }
    d[i] = nr;
    d[i + 1] = ng;
    d[i + 2] = nb;
  }
  ctx.putImageData(img, 0, 0);
  return grade(c, "contrast(1.45) saturate(1.65) brightness(1.06)");
}

export function microReveal(src: HTMLCanvasElement): HTMLCanvasElement {
  return grade(sharpen(teleCrop(src, 2.2), 2.0), "contrast(1.28) saturate(1.1) brightness(1.03)");
}
