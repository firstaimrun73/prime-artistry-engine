import type { Controls, FrameDef } from "./frames-compose";
import { fillTexture, roundRect, drawWm, drawGlassPanel } from "./frames-compose";

/** Scene / carousel background behind the physical frame (Premium). */
function drawSceneBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  kind: NonNullable<FrameDef["sceneBg"]>,
) {
  ctx.save();
  if (kind === "velvetHibiscus") {
    const mid = w * 0.55;
    const lg = ctx.createLinearGradient(0, 0, mid, 0);
    lg.addColorStop(0, "#e8dfd0");
    lg.addColorStop(1, "#d4c8b4");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, mid, h);
    const rg = ctx.createLinearGradient(mid, 0, w, 0);
    rg.addColorStop(0, "#3a0c14");
    rg.addColorStop(1, "#1a060a");
    ctx.fillStyle = rg;
    ctx.fillRect(mid, 0, w - mid, h);
    const petals: [number, number, number, string][] = [
      [w * 0.12, h * 0.28, Math.min(w, h) * 0.22, "rgba(140,20,40,0.55)"],
      [w * 0.08, h * 0.55, Math.min(w, h) * 0.18, "rgba(120,16,36,0.5)"],
      [w * 0.88, h * 0.62, Math.min(w, h) * 0.2, "rgba(160,28,48,0.45)"],
      [w * 0.82, h * 0.35, Math.min(w, h) * 0.16, "rgba(100,12,28,0.4)"],
    ];
    for (const [px, py, pr, col] of petals) {
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * 0.85, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
  } else if (kind === "lotusGarden") {
    ctx.fillStyle = "#c9b8a0";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      const x = ((i * 97) % 100) / 100 * w;
      const y = ((i * 53) % 100) / 100 * h;
      ctx.beginPath();
      ctx.arc(x, y, 18 + (i % 5) * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,40,90,${0.08 + (i % 3) * 0.04})`;
      ctx.fill();
    }
    for (const [cx, cy, s] of [
      [w * 0.5, h * 0.08, 1],
      [w * 0.2, h * 0.05, 0.7],
      [w * 0.8, h * 0.06, 0.8],
      [w * 0.15, h * 0.92, 0.6],
      [w * 0.85, h * 0.9, 0.7],
    ] as [number, number, number][]) {
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(a) * 22 * s,
          cy + Math.sin(a) * 14 * s,
          14 * s,
          8 * s,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(180,30,100,${0.35 + p * 0.05})`;
        ctx.fill();
      }
    }
  } else if (kind === "museumWall") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2a2a2e");
    g.addColorStop(0.5, "#1c1c20");
    g.addColorStop(1, "#121214");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.015 + (i % 5) * 0.005})`;
      ctx.fillRect((i * 37) % w, (i * 61) % h, 2, 1);
    }
  } else if (kind === "filmDark") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
  } else if (kind === "linenStudio") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#f0ebe3");
    g.addColorStop(1, "#ddd4c8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = "rgba(0,0,0,0.03)";
      ctx.beginPath();
      ctx.moveTo(0, (i / 40) * h);
      ctx.lineTo(w, (i / 40) * h + 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Baroque / rococo carved corner and edge ornament (Premium). */
function drawBaroqueOrnament(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  border: number,
  gold: boolean,
) {
  ctx.save();
  const c0 = gold ? "rgba(232,200,100,0.95)" : "rgba(180,140,80,0.9)";
  const c1 = gold ? "rgba(160,110,40,0.85)" : "rgba(80,50,25,0.8)";
  const cHi = "rgba(255,240,180,0.7)";
  for (let i = 0; i < 4; i++) {
    const inset = border * (0.08 + i * 0.12);
    ctx.strokeStyle = i % 2 === 0 ? c0 : c1;
    ctx.lineWidth = Math.max(1.5, border * 0.08);
    ctx.strokeRect(ox + inset, oy + inset, ow - inset * 2, oh - inset * 2);
  }
  const beadInset = border * 0.55;
  ctx.strokeStyle = cHi;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 3]);
  ctx.strokeRect(
    ox + beadInset,
    oy + beadInset,
    ow - beadInset * 2,
    oh - beadInset * 2,
  );
  ctx.setLineDash([]);
  const cs = Math.max(14, border * 0.7);
  const corners: [number, number, number][] = [
    [ox + border * 0.35, oy + border * 0.35, 0],
    [ox + ow - border * 0.35, oy + border * 0.35, 1],
    [ox + border * 0.35, oy + oh - border * 0.35, 2],
    [ox + ow - border * 0.35, oy + oh - border * 0.35, 3],
  ];
  for (const [cx, cy, rot] of corners) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(cs * 0.3, -cs * 0.5, cs * 0.8, -cs * 0.6, cs, -cs * 0.2);
    ctx.bezierCurveTo(cs * 1.1, cs * 0.2, cs * 0.5, cs * 0.5, 0, cs * 0.3);
    ctx.closePath();
    const lg = ctx.createLinearGradient(-cs, -cs, cs, cs);
    lg.addColorStop(0, cHi);
    lg.addColorStop(0.5, c0);
    lg.addColorStop(1, c1);
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cs * 0.35, -cs * 0.15, cs * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = cHi;
    ctx.fill();
    ctx.restore();
  }
  for (const [mx, my, horiz] of [
    [ox + ow / 2, oy + border * 0.28, true],
    [ox + ow / 2, oy + oh - border * 0.28, true],
    [ox + border * 0.28, oy + oh / 2, false],
    [ox + ow - border * 0.28, oy + oh / 2, false],
  ] as [number, number, boolean][]) {
    ctx.save();
    ctx.translate(mx, my);
    if (!horiz) ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-cs * 0.8, 0);
    ctx.quadraticCurveTo(0, -cs * 0.45, cs * 0.8, 0);
    ctx.quadraticCurveTo(0, cs * 0.35, -cs * 0.8, 0);
    ctx.fillStyle = c0;
    ctx.fill();
    ctx.strokeStyle = c1;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Floral polaroid decorations (lotus-inspired, canvas geometry only). */
function drawFloralPolaroid(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  bottomExtra: number,
) {
  ctx.save();
  const blooms: [number, number, number][] = [
    [ox + ow * 0.08, oy + oh * 0.12, 1],
    [ox + ow * 0.92, oy + oh * 0.55, 0.85],
    [ox + ow * 0.88, oy + oh * 0.78, 1.1],
    [ox + ow * 0.15, oy + oh * 0.85, 0.7],
  ];
  for (const [bx, by, s] of blooms) {
    const r = Math.min(ow, oh) * 0.07 * s;
    for (let p = 0; p < 7; p++) {
      const a = (p / 7) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(
        bx + Math.cos(a) * r * 0.55,
        by + Math.sin(a) * r * 0.55,
        r * 0.55,
        r * 0.32,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = p % 2 === 0 ? "rgba(220,50,110,0.85)" : "rgba(180,30,90,0.75)";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,200,60,0.9)";
    ctx.fill();
  }
  if (bottomExtra > 8) {
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    ctx.fillRect(ox + 8, oy + oh - bottomExtra + 4, ow - 16, 2);
  }
  ctx.restore();
}

/** Vintage film strip: perforations + aged paper + dust. */
function drawFilmVintage(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  border: number,
) {
  ctx.save();
  for (let i = 0; i < 35; i++) {
    const x = ox + ((i * 47) % 100) / 100 * ow;
    const y = oy + ((i * 31) % 100) / 100 * oh;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + (i % 4) * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(40,30,20,${0.15 + (i % 5) * 0.05})`;
    ctx.fill();
  }
  const holeW = Math.max(4, border * 0.28);
  const holeH = Math.max(6, border * 0.42);
  const gap = holeH * 1.35;
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  for (let y = oy + border * 0.35; y < oy + oh - border * 0.35; y += gap) {
    ctx.fillRect(ox + border * 0.22 - holeW / 2, y, holeW, holeH);
    ctx.fillRect(ox + ow - border * 0.22 - holeW / 2, y, holeW, holeH);
  }
  const vg = ctx.createLinearGradient(ox, oy, ox + border, oy);
  vg.addColorStop(0, "rgba(0,0,0,0.35)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(ox, oy, border, oh);
  const vg2 = ctx.createLinearGradient(ox + ow, oy, ox + ow - border, oy);
  vg2.addColorStop(0, "rgba(0,0,0,0.35)");
  vg2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg2;
  ctx.fillRect(ox + ow - border, oy, border, oh);
  ctx.restore();
}

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
  const bottomExtra =
    frame.polaroid || frame.floralPolaroid
      ? Math.round(Math.min(contentW, contentH) * 0.12)
      : 0;
  const baseRadius = (frame.radius / 100) * Math.min(contentW, contentH);
  const radius = Math.round(Math.max(baseRadius, controls.round * (maxEdge / 1000) * 8));
  const outerW = contentW + (border + pad) * 2;
  const outerH = contentH + (border + pad) * 2 + bottomExtra;

  const hasScene = !!frame.sceneBg;
  const scenePad = hasScene ? Math.round(Math.min(outerW, outerH) * 0.18) : 0;
  const shadowPad = controls.shadowOn ? Math.round(40 * (controls.texture / 100 + 0.3)) : 8;
  const canvas = document.createElement("canvas");
  canvas.width = outerW + (shadowPad + scenePad) * 2;
  canvas.height = outerH + (shadowPad + scenePad) * 2;
  const ctx = canvas.getContext("2d")!;
  const ox = shadowPad + scenePad;
  const oy = shadowPad + scenePad;
  const fillColor = frame.color ?? "#ffffff";

  if (frame.sceneBg) {
    drawSceneBg(ctx, canvas.width, canvas.height, frame.sceneBg);
  }

  if (controls.shadowOn) {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${0.22 + controls.texture * 0.0025})`;
    ctx.shadowBlur = 18 + controls.texture * 0.4;
    ctx.shadowOffsetY = 10 + controls.texture * 0.08;
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
  if (frame.tier === "premium" || frame.baroque) {
    bevel.addColorStop(0, "rgba(255,255,255,0.28)");
    bevel.addColorStop(0.35, "rgba(255,255,255,0.06)");
    bevel.addColorStop(0.7, "rgba(0,0,0,0.08)");
    bevel.addColorStop(1, "rgba(0,0,0,0.28)");
  } else {
    bevel.addColorStop(0, "rgba(255,255,255,0.16)");
    bevel.addColorStop(0.45, "rgba(255,255,255,0)");
    bevel.addColorStop(1, "rgba(0,0,0,0.14)");
  }
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
    if (frame.filmVintage) {
      drawFilmVintage(ctx, ox, oy, outerW, outerH, border);
    } else {
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
    ctx.strokeStyle =
      frame.sceneBg === "velvetHibiscus" || frame.texture === "velvet"
        ? "rgba(212,175,80,0.85)"
        : "rgba(0,0,0,0.12)";
    ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(
      ox + border + pad * 0.25,
      oy + border + pad * 0.25,
      outerW - border * 2 - pad * 0.5,
      outerH - border * 2 - bottomExtra - pad * 0.5,
    );
  }

  if (frame.baroque || (frame.ornamental && frame.tier === "premium")) {
    drawBaroqueOrnament(
      ctx,
      ox,
      oy,
      outerW,
      outerH,
      border,
      !!(frame.texture === "museumGold" || frame.texture === "goldfoil" || frame.texture === "brass"),
    );
  } else if (frame.ornamental || frame.treasure) {
    ctx.save();
    ctx.strokeStyle =
      frame.texture === "museumGold" || frame.treasure
        ? "rgba(212,180,80,0.55)"
        : "rgba(255,255,255,0.18)";
    ctx.lineWidth = Math.max(2, border * 0.12);
    ctx.strokeRect(ox + border * 0.25, oy + border * 0.25, outerW - border * 0.5, outerH - border * 0.5);
    const cs = Math.max(10, border * 0.55);
    const corners = [
      [ox + border * 0.3, oy + border * 0.3],
      [ox + outerW - border * 0.3, oy + border * 0.3],
      [ox + border * 0.3, oy + outerH - border * 0.3],
      [ox + outerW - border * 0.3, oy + outerH - border * 0.3],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.35, 0, Math.PI * 2);
      ctx.fillStyle =
        frame.treasure || frame.texture === "museumGold"
          ? "rgba(212,180,80,0.7)"
          : "rgba(255,255,255,0.25)";
      ctx.fill();
    }
    ctx.restore();
  }

  if (frame.floralPolaroid) {
    drawFloralPolaroid(ctx, ox, oy, outerW, outerH, bottomExtra);
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
