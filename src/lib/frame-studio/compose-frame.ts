import type { Controls, FrameDef } from "./frames-compose";
import { scaleBorder, fillWood, fillLinen, roundRect, drawWm } from "./frames-compose";

export function composeFrame(
  img: HTMLImageElement,
  frame: FrameDef,
  controls: Controls,
  maxEdge: number,
  watermark: boolean,
): HTMLCanvasElement {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const aspect = iw / Math.max(1, ih);

  let contentW: number;
  let contentH: number;
  if (aspect >= 1) {
    contentW = maxEdge;
    contentH = Math.round(maxEdge / aspect);
  } else {
    contentH = maxEdge;
    contentW = Math.round(maxEdge * aspect);
  }
  contentW = Math.max(64, contentW);
  contentH = Math.max(64, contentH);

  const border = scaleBorder(frame.baseBorder, controls.borderWidth);
  const pad = Math.round(controls.padding * (maxEdge / 1000));
  const bottomExtra = frame.bottomExtra
    ? Math.round(Math.min(contentW, contentH) * frame.bottomExtra)
    : 0;
  const radius = Math.round(
    Math.max(frame.radius, controls.round) * (maxEdge / 1000) * 8,
  );

  const outerW = contentW + (border + pad) * 2;
  const outerH = contentH + (border + pad) * 2 + bottomExtra;

  const canvas = document.createElement("canvas");
  const shadowPad = controls.shadowOn ? Math.round(40 * (controls.texture / 100 + 0.3)) : 8;
  canvas.width = outerW + shadowPad * 2;
  canvas.height = outerH + shadowPad * 2;
  const ctx = canvas.getContext("2d")!;
  const ox = shadowPad;
  const oy = shadowPad;

  if (controls.shadowOn && frame.kind !== "float") {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.12 + controls.texture * 0.003})`;
    ctx.shadowBlur = 12 + controls.texture * 0.4;
    ctx.shadowOffsetY = 6 + controls.texture * 0.08;
    ctx.fillStyle = frame.outer === "transparent" ? "#fff" : frame.outer;
    roundRect(ctx, ox, oy, outerW, outerH, radius);
    ctx.fill();
    ctx.restore();
  }

  if (frame.kind === "float") {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.2 + controls.texture * 0.004})`;
    ctx.shadowBlur = 24 + controls.texture * 0.5;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#fff";
    roundRect(ctx, ox + 4, oy + 4, outerW - 8, outerH - 8, 4);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(img, ox + 4, oy + 4, outerW - 8, outerH - 8);
    if (watermark) drawWm(ctx, canvas.width, canvas.height);
    return canvas;
  }

  if (frame.kind === "wood") {
    fillWood(ctx, ox, oy, outerW, outerH, frame.outer, frame.id === "dark-walnut");
  } else if (frame.kind === "linen") {
    fillLinen(ctx, ox, oy, outerW, outerH, frame.outer, controls.texture);
  } else if (frame.outer !== "transparent") {
    ctx.fillStyle = frame.outer;
    roundRect(ctx, ox, oy, outerW, outerH, radius);
    ctx.fill();
  }

  if (frame.kind === "ornate" && frame.accent) {
    const inset = Math.max(3, Math.round(border * 0.35));
    ctx.strokeStyle = frame.accent;
    ctx.lineWidth = Math.max(1, Math.round(border * 0.08));
    ctx.strokeRect(ox + inset, oy + inset, outerW - inset * 2, outerH - inset * 2 - bottomExtra);
  }

  if (frame.kind === "brass" && frame.accent) {
    const inset = Math.max(2, Math.round(border * 0.45));
    ctx.strokeStyle = frame.accent;
    ctx.lineWidth = Math.max(2, Math.round(border * 0.15));
    ctx.strokeRect(ox + inset, oy + inset, outerW - inset * 2, outerH - inset * 2);
  }

  if (frame.kind === "double") {
    const gap = Math.max(4, Math.round(pad * 0.6));
    ctx.strokeStyle = frame.outer;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + border + gap, oy + border + gap, outerW - (border + gap) * 2, outerH - (border + gap) * 2);
  }

  if (frame.kind === "triple") {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 2, oy + 2, outerW - 4, outerH - 4);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(ox + 6, oy + 6, outerW - 12, outerH - 12);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 12, oy + 12, outerW - 24, outerH - 24);
  }

  if (frame.kind === "stack") {
    ctx.fillStyle = "#1E1E1E";
    ctx.fillRect(ox, oy, outerW, outerH);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(ox + 10, oy + 10, outerW - 20, outerH - 20);
    ctx.fillStyle = "#1E1E1E";
    ctx.fillRect(ox + 12, oy + 12, outerW - 24, outerH - 24);
  }

  if (frame.kind === "film") {
    const holeR = Math.max(3, Math.round(border * 0.18));
    const step = holeR * 3;
    ctx.fillStyle = frame.accent ?? "#333";
    for (let y = oy + border * 0.4; y < oy + outerH - border * 0.4; y += step) {
      ctx.beginPath();
      ctx.arc(ox + border * 0.45, y, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ox + outerW - border * 0.45, y, holeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const mx = ox + border;
  const my = oy + border;
  const mw = outerW - border * 2;
  const mh = outerH - border * 2 - bottomExtra;
  if (frame.mat !== "transparent" && frame.kind !== "stack") {
    ctx.fillStyle = frame.mat;
    ctx.fillRect(mx, my, mw, mh);
  }
  if (frame.accent && (frame.kind === "solid" || frame.kind === "polaroid") && frame.id !== "minimal-line") {
    ctx.strokeStyle = frame.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
  }

  const ix = mx + pad;
  const iy = my + pad;
  const iw2 = Math.max(1, mw - pad * 2);
  const ih2 = Math.max(1, mh - pad * 2);

  ctx.save();
  if (radius > 0) {
    roundRect(ctx, ix, iy, iw2, ih2, Math.min(radius, Math.min(iw2, ih2) / 4));
    ctx.clip();
  }

  const boxA = iw2 / ih2;
  const imgA = iw / ih;
  let dw = iw2;
  let dh = ih2;
  let dx = ix;
  let dy = iy;
  if (imgA > boxA) {
    dw = iw2;
    dh = iw2 / imgA;
    dy = iy + (ih2 - dh) / 2;
  } else {
    dh = ih2;
    dw = ih2 * imgA;
    dx = ix + (iw2 - dw) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);

  if (frame.kind === "vignette") {
    const g = ctx.createRadialGradient(
      ix + iw2 / 2,
      iy + ih2 / 2,
      Math.min(iw2, ih2) * 0.35,
      ix + iw2 / 2,
      iy + ih2 / 2,
      Math.min(iw2, ih2) * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${0.35 + controls.texture * 0.004})`);
    ctx.fillStyle = g;
    ctx.fillRect(ix, iy, iw2, ih2);
  }

  if (frame.kind === "blur") {
    const edge = Math.max(8, Math.round(16 * (maxEdge / 1000)));
    const grd = ctx.createLinearGradient(ix, iy, ix, iy + edge);
    grd.addColorStop(0, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(ix, iy, iw2, edge);
  }

  ctx.restore();

  if (frame.kind === "tape" && frame.accent) {
    ctx.save();
    ctx.fillStyle = frame.accent;
    ctx.globalAlpha = 0.65;
    ctx.translate(ox + outerW * 0.12, oy + 8);
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.fillRect(-20, 0, 50, 14);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = frame.accent;
    ctx.globalAlpha = 0.65;
    ctx.translate(ox + outerW * 0.88, oy + 10);
    ctx.rotate((7 * Math.PI) / 180);
    ctx.fillRect(-20, 0, 50, 14);
    ctx.restore();
  }

  if (frame.kind === "deckled") {
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = ox + t * outerW;
      const py = oy + Math.sin(t * 28) * 2.5 + Math.sin(t * 11) * 1.2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  if (border > 4 && frame.kind !== "float" && frame.kind !== "vignette") {
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + controls.texture * 0.001})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + border + 0.5, oy + border + 0.5, outerW - border * 2 - 1, outerH - border * 2 - bottomExtra - 1);
  }

  if (watermark) drawWm(ctx, canvas.width, canvas.height);
  return canvas;
}
