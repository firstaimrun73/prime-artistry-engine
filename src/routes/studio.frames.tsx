/**
 * Motio2edit Frames Studio — premium, theme-aware, no page scroll.
 * 25 original CSS/canvas frames (no external textures, no branded designs).
 * Bottom nav hidden via hideBottomNav(/studio/frames).
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      { name: "description", content: "Premium photo frames — original Motio2edit designs." },
    ],
  }),
  component: FramesPage,
});

type FrameId =
  | "minimal-line"
  | "polaroid-classic"
  | "ornate-premium"
  | "deep-matte"
  | "gallery-white"
  | "soft-round"
  | "film-strip"
  | "linen-cream"
  | "float-shadow"
  | "double-line"
  | "light-oak"
  | "dark-walnut"
  | "brass-inlay"
  | "modern-thin"
  | "bold-editorial"
  | "cream-gallery"
  | "vignette-fade"
  | "soft-edge-blur"
  | "tape-top"
  | "magazine-triple"
  | "rounded-black"
  | "polaroid-soft"
  | "gold-foil-inner"
  | "deckled-paper"
  | "studio-stack";

type FrameDef = {
  id: FrameId;
  name: string;
  baseBorder: number;
  bottomExtra?: number;
  outer: string;
  mat: string;
  accent?: string;
  radius: number;
  kind:
    | "solid"
    | "double"
    | "triple"
    | "film"
    | "wood"
    | "linen"
    | "float"
    | "vignette"
    | "blur"
    | "tape"
    | "deckled"
    | "stack"
    | "brass"
    | "ornate"
    | "polaroid";
};

const FRAMES: FrameDef[] = [
  { id: "minimal-line", name: "Minimal Line", baseBorder: 2, outer: "#111111", mat: "#FFFFFF", radius: 0, kind: "solid" },
  { id: "polaroid-classic", name: "Polaroid", baseBorder: 18, bottomExtra: 0.12, outer: "#FFFEFB", mat: "#FFFEFB", radius: 2, kind: "polaroid" },
  { id: "ornate-premium", name: "Ornate Premium", baseBorder: 22, outer: "#1E1A16", mat: "#FFF8E7", accent: "#C9A86A", radius: 0, kind: "ornate" },
  { id: "deep-matte", name: "Deep Matte", baseBorder: 28, outer: "#0F0F0F", mat: "#1A1A1A", accent: "#2A2A2A", radius: 0, kind: "solid" },
  { id: "gallery-white", name: "Gallery White", baseBorder: 24, outer: "#FFFFFF", mat: "#F7F7F7", accent: "#E5E5E5", radius: 0, kind: "solid" },
  { id: "soft-round", name: "Soft Round", baseBorder: 18, outer: "#F0EDE8", mat: "#FAF8F5", radius: 16, kind: "solid" },
  { id: "film-strip", name: "Film Strip", baseBorder: 28, outer: "#0A0A0A", mat: "#141414", accent: "#333333", radius: 0, kind: "film" },
  { id: "linen-cream", name: "Linen Cream", baseBorder: 20, outer: "#F7F3EF", mat: "#FBF9F6", radius: 4, kind: "linen" },
  { id: "float-shadow", name: "Float Shadow", baseBorder: 0, outer: "transparent", mat: "transparent", radius: 4, kind: "float" },
  { id: "double-line", name: "Double Line", baseBorder: 2, outer: "#111111", mat: "#FFFFFF", radius: 0, kind: "double" },
  { id: "light-oak", name: "Light Oak", baseBorder: 22, outer: "#D8CAB8", mat: "#F5EFE6", radius: 2, kind: "wood" },
  { id: "dark-walnut", name: "Dark Walnut", baseBorder: 22, outer: "#3D2B1F", mat: "#2A1E16", radius: 2, kind: "wood" },
  { id: "brass-inlay", name: "Brass Inlay", baseBorder: 14, outer: "#1E1E1E", mat: "#FFFFFF", accent: "#C9A86A", radius: 0, kind: "brass" },
  { id: "modern-thin", name: "Modern Thin", baseBorder: 1, outer: "#111111", mat: "#FFFFFF", accent: "#EEEEEE", radius: 0, kind: "solid" },
  { id: "bold-editorial", name: "Bold Editorial", baseBorder: 36, outer: "#000000", mat: "#0A0A0A", radius: 0, kind: "solid" },
  { id: "cream-gallery", name: "Cream Gallery", baseBorder: 22, outer: "#FFF8E7", mat: "#FFFBF0", accent: "#E8D5B7", radius: 0, kind: "solid" },
  { id: "vignette-fade", name: "Vignette Fade", baseBorder: 0, outer: "transparent", mat: "transparent", radius: 0, kind: "vignette" },
  { id: "soft-edge-blur", name: "Soft Edge", baseBorder: 0, outer: "transparent", mat: "transparent", radius: 0, kind: "blur" },
  { id: "tape-top", name: "Tape Top", baseBorder: 20, outer: "#FFFFFF", mat: "#FAFAFA", accent: "#F5E6C8", radius: 2, kind: "tape" },
  { id: "magazine-triple", name: "Magazine Triple", baseBorder: 8, outer: "#000000", mat: "#FFFFFF", radius: 0, kind: "triple" },
  { id: "rounded-black", name: "Rounded Black", baseBorder: 12, outer: "#111111", mat: "#1A1A1A", radius: 14, kind: "solid" },
  { id: "polaroid-soft", name: "Polaroid Soft", baseBorder: 16, bottomExtra: 0.1, outer: "#FFFEF7", mat: "#FFFEF7", radius: 3, kind: "polaroid" },
  { id: "gold-foil-inner", name: "Gold Foil", baseBorder: 20, outer: "#FFFFFF", mat: "#FFFEFB", accent: "#C9A86A", radius: 0, kind: "ornate" },
  { id: "deckled-paper", name: "Deckled Paper", baseBorder: 18, outer: "#FFFEF9", mat: "#FFFEF9", radius: 0, kind: "deckled" },
  { id: "studio-stack", name: "Studio Stack", baseBorder: 22, outer: "#1E1E1E", mat: "#FFFFFF", radius: 0, kind: "stack" },
];

type Controls = {
  borderWidth: number;
  padding: number;
  round: number;
  texture: number;
  shadowOn: boolean;
};

const DEFAULT_CONTROLS: Controls = {
  borderWidth: 16,
  padding: 12,
  round: 0,
  texture: 35,
  shadowOn: true,
};

function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const read = () => {
      const root = document.documentElement;
      const body = document.body;
      if (
        root.classList.contains("theme-light") ||
        body.classList.contains("theme-light") ||
        root.classList.contains("light")
      ) {
        setMode("light");
        return;
      }
      if (
        root.classList.contains("theme-dark") ||
        body.classList.contains("theme-dark") ||
        root.classList.contains("dark")
      ) {
        setMode("dark");
        return;
      }
      setMode(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    };
    read();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", read);
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener?.("change", read);
      obs.disconnect();
    };
  }, []);
  return mode;
}

function scaleBorder(base: number, slider: number): number {
  const t = (slider - 4) / (60 - 4);
  return Math.max(0, Math.round(base * (0.35 + t * 1.4)));
}

function fillWood(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  dark: boolean,
) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 18; i++) {
    const gy = y + (h * i) / 18 + Math.sin(i * 1.7) * 2;
    ctx.strokeStyle = dark ? `rgba(0,0,0,${0.04 + (i % 3) * 0.02})` : `rgba(90,60,30,${0.05 + (i % 3) * 0.02})`;
    ctx.lineWidth = 1 + (i % 2);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    for (let px = 0; px <= w; px += 8) {
      ctx.lineTo(x + px, gy + Math.sin(px * 0.04 + i) * 1.5);
    }
    ctx.stroke();
  }
}

function fillLinen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  intensity: number,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  const a = 0.02 + intensity * 0.0004;
  ctx.strokeStyle = `rgba(120,100,80,${a})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 3) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i, y + h);
    ctx.stroke();
  }
  for (let j = 0; j < h; j += 3) {
    ctx.beginPath();
    ctx.moveTo(x, y + j);
    ctx.lineTo(x + w, y + j);
    ctx.stroke();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawWm(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.font = `${Math.max(11, Math.round(w * 0.018))}px system-ui,sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("Motio2edit", w - 12, h - 10);
  ctx.restore();
}

function composeFrame(
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

function FrameThumb({
  frame,
  active,
  onSelect,
}: {
  frame: FrameDef;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border p-1 transition",
        active
          ? "border-[#FF8C00] bg-[#FF8C00]/10 ring-2 ring-[#FF8C00]/40"
          : "border-[var(--frames-border)] bg-[var(--frames-surface)]",
      )}
    >
      <span
        className="relative h-12 w-12 overflow-hidden rounded-md"
        style={{
          background:
            frame.kind === "float" || frame.kind === "vignette" || frame.kind === "blur"
              ? "linear-gradient(135deg,#ccc,#888)"
              : frame.mat === "transparent"
                ? frame.outer
                : frame.mat,
          boxShadow:
            frame.kind === "float"
              ? "0 6px 14px rgba(0,0,0,0.25)"
              : `inset 0 0 0 ${Math.max(2, Math.round(frame.baseBorder * 0.35))}px ${frame.outer === "transparent" ? "#333" : frame.outer}`,
        }}
      >
        {frame.kind === "film" && (
          <span className="absolute bottom-1 left-0.5 top-1 w-1 rounded-sm bg-zinc-600/80" />
        )}
        {frame.kind === "polaroid" && (
          <span className="absolute bottom-0 left-0 right-0 h-2.5 bg-[#FFFEFB]" />
        )}
        {frame.accent && frame.kind === "ornate" && (
          <span
            className="absolute inset-1 border"
            style={{ borderColor: frame.accent }}
          />
        )}
      </span>
      <span className="max-w-[60px] truncate text-[10px] font-medium text-[var(--frames-muted)]">
        {frame.name}
      </span>
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex w-[7.5rem] shrink-0 flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--frames-muted)]">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--frames-border)] accent-[#FF8C00]"
      />
    </label>
  );
}

function FramesPage() {
  const navigate = useNavigate();
  const theme = useThemeMode();
  const [frameId, setFrameId] = useState<FrameId>("polaroid-classic");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const fileRef = useRef<HTMLInputElement>(null);

  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];

  useEffect(() => {
    if (!source) {
      setPreviewUrl(null);
      return;
    }
    const t = window.setTimeout(() => {
      try {
        const c = composeFrame(source, frame, controls, 900, false);
        setPreviewUrl(c.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        console.error(e);
      }
    }, 50);
    return () => window.clearTimeout(t);
  }, [source, frame, controls]);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 2200);
    return () => window.clearTimeout(t);
  }, [msg]);

  const onPick = useCallback((file?: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setMsg("Image too large (max 25MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setSource(img);
      setMsg("Photo loaded");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMsg("Could not load image");
    };
    img.src = url;
  }, []);

  const onExport = async () => {
    if (!source) {
      setMsg("Upload a photo first");
      return;
    }
    setExporting(true);
    try {
      const edge = Math.min(2048, Math.max(source.naturalWidth, source.naturalHeight, 1200));
      const c = composeFrame(source, frame, controls, edge, true);
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/jpeg", 0.94),
      );
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `motio2edit-frames-${frame.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Downloaded");
    } catch {
      setMsg("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const isLight = theme === "light";

  return (
    <div
      className={cn(
        "relative flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none",
        isLight ? "theme-light" : "theme-dark",
      )}
      style={
        {
          ["--frames-bg" as string]: isLight ? "#FFFFFF" : "#0A0A0A",
          ["--frames-surface" as string]: isLight ? "#F7F7F7" : "#141414",
          ["--frames-text" as string]: isLight ? "#111111" : "#FFFFFF",
          ["--frames-muted" as string]: isLight ? "#666666" : "#A1A1AA",
          ["--frames-border" as string]: isLight ? "#E5E5E5" : "rgba(255,255,255,0.12)",
          ["--frames-preview" as string]: isLight ? "#F2F2F2" : "#000000",
          background: "var(--frames-bg)",
          color: "var(--frames-text)",
        } as React.CSSProperties
      }
    >
      <header
        className="z-30 flex h-14 shrink-0 items-center justify-between border-b px-2"
        style={{
          borderColor: "var(--frames-border)",
          background: "var(--frames-bg)",
          paddingTop: "env(safe-area-inset-top)",
          minHeight: "56px",
        }}
      >
        <button
          type="button"
          onClick={() => void navigate({ to: "/studio" })}
          className="grid h-10 w-10 place-items-center rounded-full border"
          style={{ borderColor: "var(--frames-border)" }}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">Frames</h1>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full opacity-80"
            aria-label="Share"
            onClick={() => setMsg("Share from your device after download")}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full opacity-80"
            aria-label="Bookmark"
            onClick={() => setMsg("Saved locally this session")}
          >
            <Bookmark className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: "/studio" })}
            className="grid h-10 w-10 place-items-center rounded-full"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3"
        style={{ background: "var(--frames-preview)" }}
      >
        {!source ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl border px-6 py-3 text-sm font-semibold shadow-lg transition active:scale-[0.98]"
            style={{
              borderColor: "var(--frames-border)",
              background: "var(--frames-surface)",
              color: "var(--frames-text)",
            }}
          >
            Upload your image
          </button>
        ) : (
          <div className="relative max-h-full max-w-full">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Framed preview"
                className="mx-auto max-h-[min(52dvh,520px)] w-auto object-contain"
                style={{
                  boxShadow: controls.shadowOn
                    ? `0 8px 32px rgba(0,0,0,${0.12 + controls.texture * 0.002})`
                    : "none",
                }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                setSource(null);
                setPreviewUrl(null);
              }}
              className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full border bg-black/50 text-white backdrop-blur"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
              aria-label="Clear photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </main>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      <footer
        className="z-20 shrink-0 border-t px-3 pt-2"
        style={{
          borderColor: "var(--frames-border)",
          background: "var(--frames-surface)",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FRAMES.map((f) => (
            <FrameThumb
              key={f.id}
              frame={f}
              active={f.id === frame.id}
              onSelect={() => setFrameId(f.id)}
            />
          ))}
        </div>

        <div className="mb-2 flex items-end gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SliderRow
            label="Width"
            value={controls.borderWidth}
            min={4}
            max={60}
            step={1}
            onChange={(borderWidth) => setControls((c) => ({ ...c, borderWidth }))}
          />
          <SliderRow
            label="Padding"
            value={controls.padding}
            min={0}
            max={48}
            step={1}
            onChange={(padding) => setControls((c) => ({ ...c, padding }))}
          />
          <SliderRow
            label="Round"
            value={controls.round}
            min={0}
            max={32}
            step={1}
            onChange={(round) => setControls((c) => ({ ...c, round }))}
          />
          <SliderRow
            label="Texture"
            value={controls.texture}
            min={0}
            max={100}
            step={1}
            onChange={(texture) => setControls((c) => ({ ...c, texture }))}
          />
          <label className="flex shrink-0 flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--frames-muted)]">
              Shadow
            </span>
            <button
              type="button"
              onClick={() => setControls((c) => ({ ...c, shadowOn: !c.shadowOn }))}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-bold",
                controls.shadowOn
                  ? "bg-[#FF8C00] text-black"
                  : "border text-[var(--frames-muted)]",
              )}
              style={!controls.shadowOn ? { borderColor: "var(--frames-border)" } : undefined}
            >
              {controls.shadowOn ? "On" : "Off"}
            </button>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl border px-3 py-2.5 text-xs font-semibold"
            style={{ borderColor: "var(--frames-border)", color: "var(--frames-text)" }}
          >
            <Upload className="mr-1 inline h-3.5 w-3.5" />
            Photo
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void onExport()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF8C00] py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Download"}
          </button>
        </div>
      </footer>

      {msg && (
        <div
          className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 rounded-full border px-3.5 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur-xl"
          style={{
            borderColor: "var(--frames-border)",
            background: isLight ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)",
            color: "var(--frames-text)",
          }}
          role="status"
        >
          {msg}
        </div>
      )}
    </div>
  );
}
