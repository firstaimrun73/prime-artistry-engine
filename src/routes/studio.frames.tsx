/**
 * Frames Studio — media-first, ratio-matched, distinct designs.
 * - Frame set filtered to source image's native ratio (no forced crop).
 * - Genuinely distinct aesthetic designs (not color swatches).
 * - No top nav bar; full-bleed dark presentation.
 * - Glass labels instead of generic toasts.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      {
        name: "description",
        content: "Frame your photo with ratio-matched designs.",
      },
    ],
  }),
  component: FramesPage,
});

type RatioFamily = "square" | "portrait" | "landscape" | "ultrawide";

type FrameDesign = {
  id: string;
  name: string;
  families: RatioFamily[];
  style: "minimal-line" | "polaroid" | "film-strip" | "ornate" | "matte-deep" | "gallery" | "rounded-soft" | "editorial";
  borderColor: string;
  matColor: string;
  accentColor?: string;
  borderW: number;
  matW: number;
};

const FRAME_DESIGNS: FrameDesign[] = [
  {
    id: "minimal-line",
    name: "Minimal Line",
    families: ["square", "portrait", "landscape", "ultrawide"],
    style: "minimal-line",
    borderColor: "#e8e8e8",
    matColor: "#0a0a0a",
    borderW: 0.012,
    matW: 0.008,
  },
  {
    id: "polaroid",
    name: "Polaroid",
    families: ["square", "portrait"],
    style: "polaroid",
    borderColor: "#f7f5f0",
    matColor: "#f7f5f0",
    borderW: 0.035,
    matW: 0.14,
  },
  {
    id: "film-strip",
    name: "Film Strip",
    families: ["portrait", "landscape"],
    style: "film-strip",
    borderColor: "#111",
    matColor: "#1a1a1a",
    accentColor: "#333",
    borderW: 0.08,
    matW: 0.02,
  },
  {
    id: "ornate-editorial",
    name: "Ornate",
    families: ["portrait", "landscape", "square"],
    style: "ornate",
    borderColor: "#2c1810",
    matColor: "#f4efe6",
    accentColor: "#c9a227",
    borderW: 0.055,
    matW: 0.04,
  },
  {
    id: "matte-deep",
    name: "Deep Matte",
    families: ["square", "portrait", "landscape", "ultrawide"],
    style: "matte-deep",
    borderColor: "#0d0d0d",
    matColor: "#141414",
    borderW: 0.07,
    matW: 0.045,
  },
  {
    id: "gallery-white",
    name: "Gallery",
    families: ["square", "portrait", "landscape"],
    style: "gallery",
    borderColor: "#fafafa",
    matColor: "#ffffff",
    borderW: 0.04,
    matW: 0.06,
  },
  {
    id: "rounded-soft",
    name: "Soft Round",
    families: ["square", "portrait"],
    style: "rounded-soft",
    borderColor: "#1c1c1e",
    matColor: "#2c2c2e",
    borderW: 0.03,
    matW: 0.025,
  },
  {
    id: "editorial-thin",
    name: "Editorial",
    families: ["landscape", "ultrawide", "portrait"],
    style: "editorial",
    borderColor: "#111",
    matColor: "#f8f6f1",
    borderW: 0.018,
    matW: 0.035,
  },
];

function ratioFamily(w: number, h: number): RatioFamily {
  const r = w / h;
  if (r > 0.92 && r < 1.08) return "square";
  if (r >= 2.0) return "ultrawide";
  if (r > 1.05) return "landscape";
  return "portrait";
}

function nearestAspectLabel(w: number, h: number): string {
  const r = w / h;
  const presets: [string, number][] = [
    ["1:1", 1],
    ["4:5", 4 / 5],
    ["3:4", 3 / 4],
    ["2:3", 2 / 3],
    ["9:16", 9 / 16],
    ["4:3", 4 / 3],
    ["3:2", 3 / 2],
    ["16:9", 16 / 9],
    ["21:9", 21 / 9],
  ];
  let best = presets[0];
  let bestDiff = Infinity;
  for (const p of presets) {
    const d = Math.abs(Math.log(r / p[1]));
    if (d < bestDiff) {
      bestDiff = d;
      best = p;
    }
  }
  return best[0];
}

function compose(
  img: HTMLImageElement,
  design: FrameDesign,
  maxEdge: number,
): HTMLCanvasElement {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const aspect = iw / ih;

  let w: number;
  let h: number;
  if (aspect >= 1) {
    w = maxEdge;
    h = Math.round(maxEdge / aspect);
  } else {
    h = maxEdge;
    w = Math.round(maxEdge * aspect);
  }
  w = Math.max(64, w);
  h = Math.max(64, h);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const minDim = Math.min(w, h);
  const borderPx = Math.round(minDim * design.borderW);
  const matPx = Math.round(minDim * design.matW);

  ctx.fillStyle = design.borderColor;
  ctx.fillRect(0, 0, w, h);

  if (design.style === "film-strip") {
    const holeR = Math.max(3, Math.round(borderPx * 0.22));
    const step = holeR * 3.2;
    ctx.fillStyle = design.accentColor ?? "#333";
    for (let y = borderPx * 0.35; y < h - borderPx * 0.35; y += step) {
      ctx.beginPath();
      ctx.arc(borderPx * 0.45, y, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w - borderPx * 0.45, y, holeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (design.style === "ornate") {
    const inset = Math.round(borderPx * 0.35);
    ctx.strokeStyle = design.accentColor ?? "#c9a227";
    ctx.lineWidth = Math.max(1, Math.round(minDim * 0.004));
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  }

  ctx.fillStyle = design.matColor;
  ctx.fillRect(borderPx, borderPx, w - borderPx * 2, h - borderPx * 2);

  const px = borderPx + matPx;
  const py = borderPx + matPx;
  const pw = Math.max(1, w - px * 2);
  const ph = Math.max(1, h - py * 2);

  if (design.style === "rounded-soft") {
    const r = Math.min(pw, ph) * 0.04;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, r);
    ctx.arcTo(px + pw, py + ph, px, py + ph, r);
    ctx.arcTo(px, py + ph, px, py, r);
    ctx.arcTo(px, py, px + pw, py, r);
    ctx.closePath();
    ctx.clip();
  }

  const boxA = pw / ph;
  const imgA = iw / ih;
  let dw = pw;
  let dh = ph;
  let dx = px;
  let dy = py;
  if (imgA > boxA) {
    dw = pw;
    dh = pw / imgA;
    dy = py + (ph - dh) / 2;
  } else {
    dh = ph;
    dw = ph * imgA;
    dx = px + (pw - dw) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);

  if (design.style === "rounded-soft") ctx.restore();

  if (design.style === "minimal-line") {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, Math.round(minDim * 0.003));
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  if (design.style === "editorial") {
    ctx.fillStyle = "#111";
    const rule = Math.max(1, Math.round(minDim * 0.004));
    ctx.fillRect(px, py - rule * 2, pw, rule);
    ctx.fillRect(px, py + ph + rule, pw, rule);
  }

  return canvas;
}

function GlassLabel({
  children,
  className,
  onDismiss,
}: {
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}) {
  useEffect(() => {
    if (!onDismiss) return;
    const t = window.setTimeout(onDismiss, 2200);
    return () => window.clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-3.5 py-1.5 text-[11px] font-medium text-white/95 shadow-lg backdrop-blur-xl",
        className,
      )}
      role="status"
    >
      {children}
    </div>
  );
}

function FramesPage() {
  const [designId, setDesignId] = useState(FRAME_DESIGNS[0].id);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [family, setFamily] = useState<RatioFamily | null>(null);
  const [aspectLabel, setAspectLabel] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [glassMsg, setGlassMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const available = useMemo(() => {
    if (!family) return FRAME_DESIGNS;
    return FRAME_DESIGNS.filter((d) => d.families.includes(family));
  }, [family]);

  const design =
    available.find((d) => d.id === designId) ?? available[0] ?? FRAME_DESIGNS[0];

  useEffect(() => {
    if (!available.some((d) => d.id === designId) && available[0]) {
      setDesignId(available[0].id);
    }
  }, [available, designId]);

  useEffect(() => {
    if (!source) {
      setPreviewUrl(null);
      return;
    }
    const t = setTimeout(() => {
      try {
        const c = compose(source, design, 900);
        setPreviewUrl(c.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        console.error(e);
      }
    }, 40);
    return () => clearTimeout(t);
  }, [source, design]);

  const onPick = useCallback((file?: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setGlassMsg("Image too large");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth < 16) {
        setGlassMsg("Invalid image");
        return;
      }
      const fam = ratioFamily(img.naturalWidth, img.naturalHeight);
      setFamily(fam);
      setAspectLabel(nearestAspectLabel(img.naturalWidth, img.naturalHeight));
      setSource(img);
      setGlassMsg(`Loaded · ${nearestAspectLabel(img.naturalWidth, img.naturalHeight)} frames`);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setGlassMsg("Could not load image");
    };
    img.src = url;
  }, []);

  const onExport = async () => {
    if (!source) {
      setGlassMsg("Upload a photo first");
      return;
    }
    setExporting(true);
    try {
      const edge = Math.min(4096, Math.max(source.naturalWidth, source.naturalHeight));
      const c = compose(source, design, edge);
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/jpeg", 0.94),
      );
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `motio2edit-frames-${design.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      setGlassMsg("Exported");
    } catch {
      setGlassMsg("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const clear = () => {
    setSource(null);
    setFamily(null);
    setAspectLabel(null);
    setPreviewUrl(null);
    setGlassMsg(null);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-zinc-950 text-zinc-50">
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to="/studio"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-xl"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-amber-300/90 backdrop-blur-md">
          FRAMES
        </span>
        <div className="w-10" />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-52 pt-14">
        {!source ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 px-5 py-2.5 text-sm font-medium text-white/95 shadow-xl backdrop-blur-xl transition active:scale-95"
          >
            Upload your image here
          </button>
        ) : (
          <div className="relative w-full max-w-lg">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Framed"
                className="mx-auto max-h-[min(55dvh,580px)] w-auto rounded-lg object-contain shadow-2xl"
              />
            )}
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
            {aspectLabel && (
              <p className="mt-2 text-center text-[10px] text-zinc-500">
                Source {aspectLabel} · matching frames only
              </p>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {source && (
        <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div className="mx-auto max-w-lg">
            <p className="mb-1.5 text-center text-[10px] text-zinc-500">
              Distinct designs for {aspectLabel ?? "this ratio"}
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {available.map((d) => {
                const active = d.id === design.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDesignId(d.id)}
                    className={cn(
                      "flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-xl border p-1.5 transition",
                      active
                        ? "border-amber-400/60 bg-amber-500/10 ring-1 ring-amber-400/40"
                        : "border-white/10 bg-black/30",
                    )}
                  >
                    <span
                      className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md"
                      style={{ background: d.matColor }}
                    >
                      <span
                        className="absolute inset-0"
                        style={{
                          boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(d.borderW * 40))}px ${d.borderColor}`,
                        }}
                      />
                      {d.style === "film-strip" && (
                        <span className="absolute left-0.5 top-1 bottom-1 w-1 rounded-sm bg-zinc-600/80" />
                      )}
                      {d.style === "polaroid" && (
                        <span className="absolute bottom-0 left-0 right-0 h-2.5 bg-[#f7f5f0]" />
                      )}
                      {d.style === "ornate" && (
                        <span
                          className="absolute inset-1 border"
                          style={{ borderColor: d.accentColor ?? "#c9a227" }}
                        />
                      )}
                    </span>
                    <span className="max-w-[68px] truncate text-[9px] font-semibold text-zinc-300">
                      {d.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2.5 text-xs font-semibold text-zinc-200 backdrop-blur-xl"
              >
                <Upload className="mr-1 inline h-3.5 w-3.5" /> Photo
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void onExport()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500/90 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                {exporting ? "Exporting…" : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      {glassMsg && (
        <GlassLabel
          className="bottom-[max(8rem,env(safe-area-inset-bottom)+6.5rem)]"
          onDismiss={() => setGlassMsg(null)}
        >
          {glassMsg}
        </GlassLabel>
      )}
    </div>
  );
}
