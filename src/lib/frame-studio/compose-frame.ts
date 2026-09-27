import type { Controls, FrameDef } from "./frames-compose";
import { fillTexture, roundRect, drawWm } from "./frames-compose";

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
  if (aspect >= 1) { contentW = maxEdge; contentH = Math.round(maxEdge / aspect); }
  else { contentH = maxEdge; contentW = Math.round(maxEdge * aspect); }
  contentW = Math.max(64, contentW); contentH = Math.max(64, contentH);

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
  const ox = shadowPad, oy = shadowPad;
  const fillColor = frame.color ?? "#ffffff";

  if (controls.shadowOn) {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.12 + controls.texture * 0.003})`;
    ctx.shadowBlur = 12 + controls.texture * 0.4;
    ctx.shadowOffsetY = 6 + controls.texture * 0.08;
    ctx.fillStyle = fillColor;
    roundRect(ctx, ox, oy, outerW, outerH, radius); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, ox, oy, outerW, outerH, radius); ctx.clip();
  if (frame.texture) fillTexture(ctx, ox, oy, outerW, outerH, frame.texture, controls.texture);
  else { ctx.fillStyle = fillColor; ctx.fillRect(ox, oy, outerW, outerH); }
  const g = ctx.createLinearGradient(ox, oy, ox, oy + outerH);
  g.addColorStop(0, "rgba(255,255,255,0.12)"); g.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = g; ctx.fillRect(ox, oy, outerW, outerH);
  ctx.restore();

  if (frame.kind === "glass" && (frame.tint ?? 0) > 0) {
    ctx.save();
    roundRect(ctx, ox, oy, outerW, outerH, radius); ctx.clip();
    const tc = frame.tintColor ?? "255,255,255";
    if (frame.aurora) {
      const ag = ctx.createLinearGradient(ox, oy, ox + outerW, oy + outerH);
      ag.addColorStop(0, "rgba(255,120,200,0.25)"); ag.addColorStop(1, "rgba(120,200,255,0.2)");
      ctx.fillStyle = ag;
    } else ctx.fillStyle = `rgba(${tc},${frame.tint})`;
    ctx.fillRect(ox, oy, outerW, outerH);
    ctx.restore();
  }

  if (frame.perf || frame.filmreel) {
    const holeR = Math.max(3, Math.round(border * 0.18));
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    for (let y = oy + border * 0.4; y < oy + outerH - border * 0.4; y += holeR * 3) {
      ctx.beginPath(); ctx.arc(ox + border * 0.45, y, holeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ox + outerW - border * 0.45, y, holeR, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (frame.browser) {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(ox + border, oy + border, outerW - border * 2, Math.max(10, border * 0.8));
  }
  if (frame.stitched) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.strokeRect(ox + border * 0.4, oy + border * 0.4, outerW - border * 0.8, outerH - border * 0.8);
    ctx.setLineDash([]);
  }
  if (frame.brackets) {
    const b = Math.max(12, border);
    ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
    for (const [cx, cy] of [[ox+pad,oy+pad],[ox+outerW-pad,oy+pad],[ox+pad,oy+outerH-pad-bottomExtra],[ox+outerW-pad,oy+outerH-pad-bottomExtra]] as const) {
      ctx.beginPath(); ctx.moveTo(cx - b*0.3, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + b*0.3); ctx.stroke();
    }
  }

  const mx = ox + border, my = oy + border;
  const mw = outerW - border * 2, mh = outerH - border * 2 - bottomExtra;
  const ix = mx + pad, iy = my + pad;
  const iw2 = Math.max(1, mw - pad * 2), ih2 = Math.max(1, mh - pad * 2);

  ctx.save();
  const photoR = Math.min(radius * 0.6, Math.min(iw2, ih2) / 4);
  if (photoR > 0 || frame.story || frame.notch) {
    roundRect(ctx, ix, iy, iw2, ih2, frame.story || frame.notch ? Math.min(iw2, ih2) * 0.12 : photoR);
    ctx.clip();
  }
  const boxA = iw2 / ih2, imgA = iw / ih;
  let dw = iw2, dh = ih2, dx = ix, dy = iy;
  if (imgA > boxA) { dw = iw2; dh = iw2 / imgA; dy = iy + (ih2 - dh) / 2; }
  else { dh = ih2; dw = ih2 * imgA; dx = ix + (iw2 - dw) / 2; }
  ctx.drawImage(img, dx, dy, dw, dh);
  if (frame.kind === "glass" && (frame.sheen ?? 0) > 0) {
    const sg = ctx.createLinearGradient(ix, iy, ix + iw2 * 0.5, iy + ih2 * 0.4);
    sg.addColorStop(0, `rgba(255,255,255,${frame.sheen! * 0.35})`); sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg; ctx.fillRect(ix, iy, iw2 * 0.55, ih2 * 0.4);
  }
  ctx.restore();

  if (frame.notch) {
    ctx.fillStyle = fillColor;
    const nw = iw2 * 0.35, nh = Math.max(6, border * 0.5);
    roundRect(ctx, ix + (iw2 - nw) / 2, iy - 1, nw, nh, nh / 2); ctx.fill();
  }
  if (border > 4 && frame.kind !== "glass") {
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + controls.texture * 0.001})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + border + 0.5, oy + border + 0.5, outerW - border * 2 - 1, outerH - border * 2 - bottomExtra - 1);
  }
  if (watermark) drawWm(ctx, canvas.width, canvas.height);
  return canvas;
}
