import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { FRAME_CATALOG, DEFAULT_FRAME_ID } from "@/lib/frames/frame-registry";
import { GLASS_CATALOG, DEFAULT_GLASS_ID } from "@/lib/frames/glass-registry";
import { ASPECT_RATIOS, DEFAULT_RATIO_ID } from "@/lib/frames/ratios";
import {
  composeFrames,
  defaultComposeOptions,
  loadImageFromFile,
  canvasToBlob,
  PREVIEW_MAX_EDGE,
  MAX_EXPORT_EDGE,
} from "@/lib/frames/compose";
import type { FramesComposeOptions, GlassId, AspectRatioId } from "@/lib/frames/types";
import { quoteFramesExport } from "@/lib/frames/pricing";

export const Route = createFileRoute("/studio/frames")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Frames — Motio2edit" },
      {
        name: "description",
        content: "Frame · Glass — present your photo in a finished frame. Deterministic composition.",
      },
    ],
  }),
  component: FramesPage,
});

function FramesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [opts, setOpts] = useState<FramesComposeOptions>(defaultComposeOptions);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((p: Partial<FramesComposeOptions>) => {
    setOpts((o) => ({ ...o, ...p }));
  }, []);

  useEffect(() => {
    if (!source) {
      setPreviewUrl(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const c = composeFrames(source, { ...opts, maxEdge: PREVIEW_MAX_EDGE });
        setPreviewUrl(c.toDataURL("image/jpeg", 0.88));
      } catch (e) {
        console.error(e);
      }
    }, 80);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [source, opts]);

  const onPick = async (file?: File) => {
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      setSource(img);
      toast.success("Photo loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please choose a valid image.");
    }
  };

  const onExport = async () => {
    if (!source) {
      toast.message("Upload a photo first");
      return;
    }
    setExporting(true);
    try {
      const edge = Math.min(MAX_EXPORT_EDGE, Math.max(source.naturalWidth, source.naturalHeight));
      const c = composeFrames(source, { ...opts, maxEdge: edge });
      const blob = await canvasToBlob(c, "image/jpeg", 0.92);
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `motio2edit-frames-${opts.frameId}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      const q = quoteFramesExport({ longEdge: edge });
      toast.success(`Exported · ${q.label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed. No credits charged.");
    } finally {
      setExporting(false);
    }
  };

  const quote = quoteFramesExport({
    longEdge: source
      ? Math.min(MAX_EXPORT_EDGE, Math.max(source.naturalWidth, source.naturalHeight))
      : PREVIEW_MAX_EDGE,
  });

  return (
    <div
      className={cn(
        "relative flex min-h-[100dvh] flex-col",
        isDark ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900",
      )}
    >
      <header
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2.5",
          isDark ? "border-white/10 bg-black/40" : "border-black/8 bg-white/70",
        )}
      >
        <Link
          to="/studio"
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full border",
            isDark ? "border-white/15 bg-white/10" : "border-black/10 bg-white",
          )}
          aria-label="Back to Studio"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Motio2edit</p>
          <h1 className="text-base font-extrabold">Frames</h1>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-3 pb-56 pt-3">
        <div
          className={cn(
            "flex max-h-[48dvh] w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border",
            isDark ? "border-white/10 bg-black/40" : "border-black/8 bg-white",
          )}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Framed preview" className="max-h-[48dvh] max-w-full object-contain" />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 px-6 py-16 text-center"
            >
              <Upload className="h-8 w-8 text-slate-500" />
              <span className="text-sm font-bold">Upload photo</span>
              <span className="text-xs opacity-60">Frame · Glass · Export</span>
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
          isDark ? "border-white/10 bg-zinc-950/95" : "border-black/8 bg-white/95",
        )}
      >
        <div className="mx-auto max-w-lg space-y-2">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {FRAME_CATALOG.filter((f) => f.enabled).slice(0, 12).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => patch({ frameId: f.id })}
                className={cn(
                  "flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 text-[9px] font-semibold",
                  opts.frameId === f.id
                    ? "border-zinc-800 ring-1 ring-zinc-800/40 dark:border-zinc-200"
                    : isDark
                      ? "border-white/10"
                      : "border-black/8",
                )}
              >
                <span className="h-8 w-8 rounded-md" style={{ background: f.borderColor }} />
                {f.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {GLASS_CATALOG.filter((g) => g.enabled).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => patch({ glassId: g.id as GlassId })}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  opts.glassId === g.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : isDark
                      ? "border-white/10 text-white/70"
                      : "border-black/8 text-zinc-600",
                )}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {ASPECT_RATIOS.filter((r) => r.id !== "custom").map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => patch({ ratioId: r.id as AspectRatioId })}
                className={cn(
                  "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold",
                  opts.ratioId === r.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : isDark
                      ? "border-white/10 text-white/70"
                      : "border-black/8 text-zinc-600",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-xs font-semibold",
                isDark ? "border-white/15" : "border-black/10",
              )}
            >
              <Upload className="mr-1 inline h-3.5 w-3.5" />
              Photo
            </button>
            <button
              type="button"
              disabled={!source || exporting}
              onClick={() => void onExport()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-2.5 text-sm font-bold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : `Export · ${quote.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
