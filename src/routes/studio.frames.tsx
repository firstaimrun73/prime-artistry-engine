/**
 * Frames Studio — self-contained route (deterministic canvas composition).
 * No AI generation. Isolated from Image/Video/Music pipelines.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      {
        name: "description",
        content: "Frame · Glass — present your photo in a finished frame.",
      },
    ],
  }),
  component: FramesPage,
});

type FrameOpt = { id: string; name: string; border: string; mat: string; borderW: number; matW: number };
type GlassOpt = { id: string; name: string; opacity: number; reflection: number };

const FRAMES: FrameOpt[] = [
  { id: "classic-black", name: "Black", border: "#1a1a1a", mat: "#f5f5f5", borderW: 0.06, matW: 0.04 },
  { id: "classic-white", name: "White", border: "#f8f8f8", mat: "#ececec", borderW: 0.06, matW: 0.04 },
  { id: "classic-gold", name: "Gold", border: "#c9a227", mat: "#1a1a1a", borderW: 0.055, matW: 0.035 },
  { id: "classic-silver", name: "Silver", border: "#a8aeb8", mat: "#f0f0f0", borderW: 0.055, matW: 0.035 },
  { id: "minimal-black", name: "Minimal", border: "#0d0d0d", mat: "#111", borderW: 0.028, matW: 0.012 },
  { id: "walnut", name: "Walnut", border: "#3d2314", mat: "#f3eee8", borderW: 0.07, matW: 0.03 },
  { id: "oak", name: "Oak", border: "#d2b48c", mat: "#fffdf8", borderW: 0.065, matW: 0.028 },
  { id: "polaroid", name: "Polaroid", border: "#fafafa", mat: "#fafafa", borderW: 0.04, matW: 0.12 },
];

const GLASS: GlassOpt[] = [
  { id: "none", name: "None", opacity: 0, reflection: 0 },
  { id: "clear", name: "Clear", opacity: 0.06, reflection: 0.22 },
  { id: "soft", name: "Soft", opacity: 0.1, reflection: 0.28 },
  { id: "frosted", name: "Frosted", opacity: 0.12, reflection: 0.18 },
  { id: "gloss", name: "Gloss", opacity: 0.07, reflection: 0.42 },
  { id: "museum", name: "Museum", opacity: 0.04, reflection: 0.12 },
];

const RATIOS: { id: string; label: string; value: number }[] = [
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
  { id: "2:3", label: "2:3", value: 2 / 3 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "21:9", label: "21:9", value: 21 / 9 },
  { id: "1.43:1", label: "IMAX", value: 1.43 },
];

function compose(
  img: HTMLImageElement,
  frame: FrameOpt,
  glass: GlassOpt,
  aspect: number,
  maxEdge: number,
): HTMLCanvasElement {
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
  ctx.fillStyle = "#e8e9ec";
  ctx.fillRect(0, 0, w, h);
  const minDim = Math.min(w, h);
  const borderPx = Math.round(minDim * frame.borderW);
  const matPx = Math.round(minDim * frame.matW);
  ctx.fillStyle = frame.border;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = frame.mat;
  ctx.fillRect(borderPx, borderPx, w - borderPx * 2, h - borderPx * 2);
  const px = borderPx + matPx;
  const py = borderPx + matPx;
  const pw = Math.max(1, w - px * 2);
  const ph = Math.max(1, h - py * 2);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
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
  if (glass.opacity > 0.01) {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, `rgba(255,255,255,${glass.opacity * 0.9})`);
    g.addColorStop(0.45, `rgba(255,255,255,${glass.opacity * 0.15})`);
    g.addColorStop(1, `rgba(200,210,230,${glass.opacity * 0.35})`);
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
  }
  if (glass.reflection > 0.05) {
    const band = ctx.createLinearGradient(px, py, px + pw * 0.5, py + ph * 0.3);
    band.addColorStop(0, `rgba(255,255,255,${Math.min(0.4, glass.reflection * 0.5)})`);
    band.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + pw * 0.55, py);
    ctx.lineTo(px + pw * 0.25, py + ph * 0.35);
    ctx.lineTo(px, py + ph * 0.22);
    ctx.closePath();
    ctx.fill();
  }
  return canvas;
}

function FramesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [frameId, setFrameId] = useState(FRAMES[0].id);
  const [glassId, setGlassId] = useState("clear");
  const [ratioId, setRatioId] = useState("4:5");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];
  const glass = GLASS.find((g) => g.id === glassId) ?? GLASS[1];
  const ratio = RATIOS.find((r) => r.id === ratioId) ?? RATIOS[1];

  useEffect(() => {
    if (!source) {
      setPreviewUrl(null);
      return;
    }
    const t = setTimeout(() => {
      try {
        const c = compose(source, frame, glass, ratio.value, 900);
        setPreviewUrl(c.toDataURL("image/jpeg", 0.88));
      } catch (e) {
        console.error(e);
      }
    }, 60);
    return () => clearTimeout(t);
  }, [source, frame, glass, ratio]);

  const onPick = useCallback((file?: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("This image is too large. Please choose a smaller image.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth < 16) {
        toast.error("Please choose a valid image.");
        return;
      }
      setSource(img);
      toast.success("Photo loaded");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Please choose a valid image.");
    };
    img.src = url;
  }, []);

  const onExport = async () => {
    if (!source) {
      toast.message("Upload a photo first");
      return;
    }
    setExporting(true);
    try {
      const edge = Math.min(4096, Math.max(source.naturalWidth, source.naturalHeight));
      const c = compose(source, frame, glass, ratio.value, edge);
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error("Export failed"))), "image/jpeg", 0.92),
      );
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `motio2edit-frames-${frame.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch {
      toast.error("We couldn't finish this frame.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={cn("relative flex min-h-[100dvh] flex-col", isDark ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900")}>
      <header className={cn("flex items-center gap-2 border-b px-3 py-2.5", isDark ? "border-white/10 bg-black/40" : "border-black/8 bg-white/70")}>
        <Link to="/studio" className={cn("grid h-10 w-10 place-items-center rounded-full border", isDark ? "border-white/15 bg-white/10" : "border-black/10 bg-white")} aria-label="Back to Studio">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Motio2edit</p>
          <h1 className="text-base font-extrabold">Frames</h1>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-3 pb-56 pt-3">
        <div className={cn("flex max-h-[48dvh] w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border", isDark ? "border-white/10 bg-black/40" : "border-black/8 bg-white")}>
          {previewUrl ? (
            <img src={previewUrl} alt="Framed preview" className="max-h-[48dvh] max-w-full object-contain" />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Upload className="h-8 w-8 text-slate-500" />
              <span className="text-sm font-bold">Upload photo</span>
              <span className="text-xs opacity-60">Frame · Glass · Export</span>
            </button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />

      <div className={cn("fixed inset-x-0 bottom-0 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2", isDark ? "border-white/10 bg-zinc-950/95" : "border-black/8 bg-white/95")}>
        <div className="mx-auto max-w-lg space-y-2">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {FRAMES.map((f) => (
              <button key={f.id} type="button" onClick={() => setFrameId(f.id)} className={cn("flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 text-[9px] font-semibold", frameId === f.id ? "border-zinc-800 ring-1 ring-zinc-800/40" : isDark ? "border-white/10" : "border-black/8")}>
                <span className="h-7 w-7 rounded-md" style={{ background: f.border }} />
                {f.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {GLASS.map((g) => (
              <button key={g.id} type="button" onClick={() => setGlassId(g.id)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold", glassId === g.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : isDark ? "border-white/10 text-white/70" : "border-black/8 text-zinc-600")}>
                {g.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {RATIOS.map((r) => (
              <button key={r.id} type="button" onClick={() => setRatioId(r.id)} className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold", ratioId === r.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : isDark ? "border-white/10 text-white/70" : "border-black/8 text-zinc-600")}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className={cn("rounded-2xl border px-3 py-2.5 text-xs font-semibold", isDark ? "border-white/15" : "border-black/10")}>
              <Upload className="mr-1 inline h-3.5 w-3.5" /> Photo
            </button>
            <button type="button" disabled={!source || exporting} onClick={() => void onExport()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-2.5 text-sm font-bold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
