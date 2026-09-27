import type { Controls, FrameDef } from "./frames-compose";
import { fillTexture, roundRect, drawWm, drawGlassPanel } from "./frames-compose";

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
  let contentW: number, contentH: number;
  if (aspect >= 1) {
    contentW = maxEdge;
    contentH = Math.round(maxEdge / aspect);
  } else {
    contentH = maxEdge;
    contentW = Math.round(maxEdge * aspect);
  }
  contentW = Math.max(64, contentW);
  contentH = Math.max(64, contentH);

  const padScale = 0.5 + (controls.padding / 48) * 1.2;
  const borderScale = 0.5 + ((controls.borderWidth - 4) / 56) * 1.2;
  const basePad = Math.round((frame.pad / 100) * Math.min(contentW, contentH) * padScale);
  const border = Math.max(2, Math.round(basePad * borderScale * (frame.wide ? 1.3 : 1)));
  const pad = Math.max(0, basePad);
  const bottomExtra = frame.polaroid ? Math.round(Math.min(contentW, contentH) * 0.12) : 0;
  const baseRadius = (frame.radius / 100) * Math.min(contentW, contentH);
  const radius = Math.round(Math.max(baseRadius, controls.round * (maxEdge / 1000) * 8));
  const outerW = contentW + (border + pad) * 2;
  const outerH = contentH + (border + pad) * 2 + bottomExtra;
  const canvas = document.createElement("canvas");
  const shadowPad = controls.shadowOn ? Math.round(40 * (controls.texture / 100 + 0.3)) : 8;
  canvas.width = outerW + shadowPad * 2;
  canvas.height = outerH + shadowPad * 2;
  const ctx = canvas.getContext("2d")!;
  const ox = shadowPad;
  const oy = shadowPad;
  const fillColor = frame.color ?? "#ffffff";

  if (controls.shadowOn) {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.18 + controls.texture * 0.0025})`;
    ctx.shadowBlur = 16 + controls.texture * 0.35;
    ctx.shadowOffsetY = 8 + controls.texture * 0.06;
    ctx.fillStyle = fillColor;
    roundRect(ctx, ox, oy, outerW, outerH, radius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, ox, oy, outerW, outerH, radius);
  ctx.clip();
  if (frame.texture) {
    fillTexture(ctx, ox, oy, outerW, outerH, frame.texture, controls.texture);
  } else {
    ctx.fillStyle = fillColor;
    ctx.fillRect(ox, oy, outerW, outerH);
  }
  const bevel = ctx.createLinearGradient(ox, oy, ox, oy + outerH);
  bevel.addColorStop(0, "rgba(255,255,255,0.16)");
  bevel.addColorStop(0.45, "rgba(255,255,255,0)");
  bevel.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = bevel;
  ctx.fillRect(ox, oy, outerW, outerH);
  ctx.restore();

  ctx.save();
  roundRect(ctx, ox + 0.5, oy + 0.5, outerW - 1, outerH - 1, radius);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  if (frame.perf || frame.filmreel) {
    const holeR = Math.max(3, Math.round(border * 0.18));
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (let y = oy + border * 0.4; y < oy + outerH - border * 0.4; y += holeR * 3) {
      ctx.beginPath();
      ctx.arc(ox + border * 0.45, y, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ox + outerW - border * 0.45, y, holeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (frame.browser) {
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(ox + border, oy + border, outerW - border * 2, Math.max(12, border * 0.85));
    const dy = oy + border + Math.max(4, border * 0.25);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ["#ff5f57", "#febc2e", "#28c840"][i]!;
      ctx.beginPath();
      ctx.arc(ox + border + 10 + i * 12, dy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (frame.stitched) {
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.25;
    ctx.strokeRect(
      ox + border * 0.35,
      oy + border * 0.35,
      outerW - border * 0.7,
      outerH - border * 0.7,
    );
    ctx.setLineDash([]);
  }
  if (frame.brackets) {
    const b = Math.max(14, border);
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 2.5;
    const corners: [number, number][] = [
      [ox + pad, oy + pad],
      [ox + outerW - pad, oy + pad],
      [ox + pad, oy + outerH - pad - bottomExtra],
      [ox + outerW - pad, oy + outerH - pad - bottomExtra],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx - b * 0.35, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + b * 0.35);
      ctx.stroke();
    }
  }
  if (frame.keyline && frame.keyline > 0) {
    const k = frame.keyline;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = k;
    ctx.strokeRect(
      ox + border + pad * 0.35,
      oy + border + pad * 0.35,
      outerW - border * 2 - pad * 0.7,
      outerH - border * 2 - bottomExtra - pad * 0.7,
    );
  }

  const mx = ox + border;
  const my = oy + border;
  const mw = outerW - border * 2;
  const mh = outerH - border * 2 - bottomExtra;
  const ix = mx + pad;
  const iy = my + pad;
  const iw2 = Math.max(1, mw - pad * 2);
  const ih2 = Math.max(1, mh - pad * 2);

  ctx.save();
  roundRect(ctx, mx, my, mw, mh, Math.max(0, radius * 0.5));
  ctx.clip();
  const well = ctx.createLinearGradient(mx, my, mx, my + 12);
  well.addColorStop(0, "rgba(0,0,0,0.28)");
  well.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = well;
  ctx.fillRect(mx, my, mw, 14);
  const wellR = ctx.createLinearGradient(mx, my, mx + 12, my);
  wellR.addColorStop(0, "rgba(0,0,0,0.18)");
  wellR.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = wellR;
  ctx.fillRect(mx, my, 14, mh);
  ctx.restore();

  // Photo
  ctx.save();
  const photoR = Math.min(radius * 0.55, Math.min(iw2, ih2) / 4);
  if (photoR > 0 || frame.story || frame.notch) {
    roundRect(
      ctx,
      ix,
      iy,
      iw2,
      ih2,
      frame.story || frame.notch ? Math.min(iw2, ih2) * 0.12 : photoR,
    );
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

  // Built-in glass frames OR user glassPanel toggle — only on photo
  if (frame.kind === "glass") {
    const tint = frame.tint ?? 0.25;
    const frost = frame.frost ?? 0;
    const sheenAmt = frame.sheen ?? 0.35;
    if (frame.aurora) {
      const ag = ctx.createLinearGradient(ix, iy, ix + iw2, iy + ih2);
      ag.addColorStop(0, "rgba(255,120,200,0.14)");
      ag.addColorStop(0.5, "rgba(120,200,255,0.1)");
      ag.addColorStop(1, "rgba(180,255,200,0.1)");
      ctx.fillStyle = ag;
      ctx.fillRect(ix, iy, iw2, ih2);
    } else if (tint > 0) {
      const tc = frame.tintColor ?? "255,255,255";
      ctx.fillStyle = `rgba(${tc},${Math.min(0.22, tint * 0.35)})`;
      ctx.fillRect(ix, iy, iw2, ih2);
    }
    if (frost > 0) {
      ctx.fillStyle = `rgba(255,255,255,${frost * 0.08})`;
      ctx.fillRect(ix, iy, iw2, ih2);
    }
    const sg = ctx.createLinearGradient(ix, iy, ix + iw2 * 0.55, iy + ih2 * 0.35);
    sg.addColorStop(0, `rgba(255,255,255,${0.14 + sheenAmt * 0.25})`);
    sg.addColorStop(0.55, "rgba(255,255,255,0.04)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(ix, iy, iw2 * 0.6, ih2 * 0.42);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw2 - 1, ih2 - 1);
  } else if (controls.glassPanel) {
    drawGlassPanel(ctx, ix, iy, iw2, ih2);
  }

  // Watermark on photo only (inside clip)
  if (watermark) {
    drawWm(ctx, ix, iy, iw2, ih2);
  }
  ctx.restore();

  if (frame.notch) {
    ctx.fillStyle = fillColor;
    const nw = iw2 * 0.35;
    const nh = Math.max(6, border * 0.5);
    roundRect(ctx, ix + (iw2 - nw) / 2, iy - 1, nw, nh, nh / 2);
    ctx.fill();
  }

  if (border > 3 && frame.kind !== "glass") {
    ctx.strokeStyle = `rgba(255,255,255,${0.1 + controls.texture * 0.001})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      ox + border + 0.5,
      oy + border + 0.5,
      outerW - border * 2 - 1,
      outerH - border * 2 - bottomExtra - 1,
    );
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.strokeRect(ix - 0.5, iy - 0.5, iw2 + 1, ih2 + 1);
  }

  return canvas;
}
