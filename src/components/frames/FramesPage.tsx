/**
 * Frames Studio page UI.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Share2,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FRAMES,
  FRAME_CREDIT_COST,
  DEFAULT_CONTROLS,
  composeFrame,
  type FrameId,
  type FrameDef,
  type Controls,
} from "@/lib/frame-studio/frames-compose";

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
          <span className="absolute inset-1 border" style={{ borderColor: frame.accent }} />
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

export function FramesPage() {
  const navigate = useNavigate();
  const theme = useThemeMode();
  const [frameId, setFrameId] = useState<FrameId>("polaroid-classic");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0]!;

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
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
            <rect x="3" y="3" width="26" height="26" rx="3" stroke="#8B5E3C" strokeWidth="2.25" />
            <path d="M3 10h6V3M22 3v6h7M29 22h-7v7M10 29V22H3" stroke="#8B5E3C" strokeWidth="2.25" strokeLinecap="round" />
            <rect x="9" y="9" width="14" height="14" rx="1.5" fill="#C4A484" opacity="0.35" />
          </svg>
          <h1 className="text-lg font-bold tracking-tight">Frames</h1>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full opacity-80"
            aria-label="Share"
            onClick={() => setMsg("Share from your device after download")}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <div className="w-10" />
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

      {source && (
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

          {adjustOpen && (
            <div className="mb-2 flex items-end gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SliderRow label="Width" value={controls.borderWidth} min={4} max={60} step={1} onChange={(borderWidth) => setControls((c) => ({ ...c, borderWidth }))} />
              <SliderRow label="Padding" value={controls.padding} min={0} max={48} step={1} onChange={(padding) => setControls((c) => ({ ...c, padding }))} />
              <SliderRow label="Round" value={controls.round} min={0} max={32} step={1} onChange={(round) => setControls((c) => ({ ...c, round }))} />
              <SliderRow label="Texture" value={controls.texture} min={0} max={100} step={1} onChange={(texture) => setControls((c) => ({ ...c, texture }))} />
              <label className="flex shrink-0 flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--frames-muted)]">Shadow</span>
                <button
                  type="button"
                  onClick={() => setControls((c) => ({ ...c, shadowOn: !c.shadowOn }))}
                  className={cn("h-8 rounded-full px-3 text-xs font-bold", controls.shadowOn ? "bg-[#FF8C00] text-black" : "border text-[var(--frames-muted)]")}
                  style={!controls.shadowOn ? { borderColor: "var(--frames-border)" } : undefined}
                >
                  {controls.shadowOn ? "On" : "Off"}
                </button>
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSource(null); setPreviewUrl(null); setAdjustOpen(false); }}
              className="rounded-2xl border px-3 py-2.5 text-xs font-semibold"
              style={{ borderColor: "var(--frames-border)", color: "var(--frames-text)" }}
            >
              <Check className="mr-1 inline h-3.5 w-3.5" />
              Done
            </button>
            <button
              type="button"
              onClick={() => setAdjustOpen((v) => !v)}
              className="rounded-2xl border px-3 py-2.5 text-xs font-semibold"
              style={{ borderColor: "var(--frames-border)", color: "var(--frames-text)" }}
            >
              <SlidersHorizontal className="mr-1 inline h-3.5 w-3.5" />
              Adjust
            </button>
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
              {exporting ? "\u2026" : `Apply \u00b7 ${FRAME_CREDIT_COST[frame.tier]}`}
            </button>
          </div>
        </footer>
      )}

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
