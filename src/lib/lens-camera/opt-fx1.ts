/** Lens FX set 1 — stronger, clearly visible optical treatments */
import { clone, grade, teleCrop, analyzeFocus } from "./opt-core";
import { sharpen } from "./opt-warp";

/**
 * Portrait: subject region stays sharp; background receives soft separation.
 * Focus follows content-aware analysis (multi-person clusters average into one region).
 * Soft elliptical falloff — no hard circular mask, no giant halo.
 */
export function portraitBloom(src: HTMLCanvasElement): HTMLCanvasElement {
  const focus = analyzeFocus(src);
  const soft = document.createElement("canvas");
  soft.width = src.width;
  soft.height = src.height;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(10px)";
  sctx.drawImage(src, 0, 0);
  sctx.filter = "none";

  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(soft, 0, 0);

  const cx = c.width * focus.x;
  const cy = c.height * Math.min(0.55, Math.max(0.28, focus.y));
  const baseR = Math.min(c.width, c.height);
  const rx = baseR * (0.42 + focus.strength * 0.12);

  const subject = document.createElement("canvas");
  subject.width = c.width;
  subject.height = c.height;
  const sctx2 = subject.getContext("2d")!;
  sctx2.drawImage(src, 0, 0);
  const mask = sctx2.createRadialGradient(cx, cy, rx * 0.35, cx, cy, rx * 1.15);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.55, "rgba(0,0,0,0.85)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  sctx2.globalCompositeOperation = "destination-in";
  sctx2.fillStyle = mask;
  sctx2.fillRect(0, 0, c.width, c.height);
  sctx2.globalCompositeOperation = "source-over";

  ctx.drawImage(subject, 0, 0);

  const vig = ctx.createRadialGradient(cx, cy, baseR * 0.28, cx, cy, baseR * 0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, c.width, c.height);

  return grade(sharpen(c, 0.75), "contrast(1.16) saturate(1.1) brightness(1.03)");
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
    cx, cy, Math.min(c.width, c.height) * 0.2,
    cx, cy, Math.min(c.width, c.height) * 0.72,
  );
  vig.addColorStop(0, "rgba(255,200,120,0.08)");
  vig.addColorStop(0.55, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(40,20,10,0.4)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * Infrared / night digital assist.
 * Full false-color mode kept for the Infraglow lens identity.
 * Use `subtle: true` for secondary night assist (photographic, not false-color).
 */
export function infrared(src: HTMLCanvasElement, subtle = false): HTMLCanvasElement {
  if (subtle) {
    const c = clone(src);
    const ctx = c.getContext("2d")!;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const lift = luma < 70 ? (70 - luma) * 0.35 : 0;
      d[i] = Math.min(255, r + lift * 0.9 + 4);
      d[i + 1] = Math.min(255, g + lift * 0.95 + 2);
      d[i + 2] = Math.min(255, b + lift * 1.1 + 6);
    }
    ctx.putImageData(img, 0, 0);
    return grade(c, "contrast(1.12) saturate(0.95) brightness(1.04)");
  }

  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
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
