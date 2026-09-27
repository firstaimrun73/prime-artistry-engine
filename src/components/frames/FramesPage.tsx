/**
 * Motio2edit Frames Studio — surgical UI + real server Apply charge.
 * States: idle (upload only) → edit (preview + carousel + Apply) → result (Download/Share/WM).
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Moon,
  Share2,
  SlidersHorizontal,
  Sun,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { readKeepWatermarkPref } from "@/lib/watermark-pref";
import { cn } from "@/lib/utils";
import { chargeFrameStudioApply } from "@/lib/frame-studio/charge.server";
import {
  FRAMES,
  FRAME_CREDIT_COST,
  DEFAULT_CONTROLS,
  composeFrame,
  framesForAspect,
  type FrameDef,
  type Controls,
} from "@/lib/frame-studio/frames-compose";

type Phase = "idle" | "edit" | "result";

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

function toggleSiteTheme(current: "light" | "dark") {
  const next = current === "light" ? "dark" : "light";
  const root = document.documentElement;
  const body = document.body;
  root.classList.remove("theme-light", "theme-dark", "light", "dark");
  body.classList.remove("theme-light", "theme-dark", "light", "dark");
  root.classList.add(next === "light" ? "theme-light" : "theme-dark");
  body.classList.add(next === "light" ? "theme-light" : "theme-dark");
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* ignore */
  }
}

function FrameThumb({
  frame,
  active,
  thumbUrl,
  onSelect,
}: {
  frame: FrameDef;
  active: boolean;
  thumbUrl: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border p-1.5 transition active:scale-[0.97]",
        active
          ? "border-[#FF5A1F] bg-[#FF5A1F]/15 ring-2 ring-[#FF5A1F]/35"
          : "border-[var(--frames-border)] bg-[var(--frames-glass)]",
      )}
      style={{ backdropFilter: "blur(12px)" }}
    >
      <span className="relative h-14 w-14 overflow-hidden rounded-lg bg-black/20">
        {thumbUrl ? (
          <img src={thumbUrl} alt={frame.name} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[9px] text-[var(--frames-muted)]">…</span>
        )}
        {frame.tier === "aiplus" && (
          <span className="absolute left-0.5 top-0.5 rounded-md bg-[#FF5A1F]/90 px-1 py-0.5 text-[8px] font-bold text-white shadow backdrop-blur-sm">
            ✨ AI+
          </span>
        )}
        {frame.tier === "premium" && (
          <span className="absolute left-0.5 top-0.5 rounded-md bg-gradient-to-r from-amber-600/95 to-yellow-500/90 px-1 py-0.5 text-[8px] font-bold text-white shadow backdrop-blur-sm">
            👑 Premium
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[9px] font-semibold leading-tight text-[var(--frames-text)]">
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
    <label className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--frames-muted)]">{label}</span>
        <span className="text-[11px] font-medium tabular-nums text-[var(--frames-text)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--frames-border)] accent-[#FF5A1F]"
      />
    </label>
  );
}

export function FramesPage() {
  const navigate = useNavigate();
  const theme = useThemeMode();
  const { profile, refreshProfile } = useAuth();
  const chargeApply = useServerFn(chargeFrameStudioApply);

  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);

  const [phase, setPhase] = useState<Phase>("idle");
  const [frameId, setFrameId] = useState("polaroid");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [sourceKey, setSourceKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [thumbCache, setThumbCache] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [wantWm, setWantWm] = useState(() => readKeepWatermarkPref());
  const fileRef = useRef<HTMLInputElement>(null);
  const applyLock = useRef(false);

  const imageAspect = source
    ? (source.naturalWidth || source.width) / Math.max(1, source.naturalHeight || source.height)
    : 1;
  const compatibleFrames = useMemo(
    () => (source ? framesForAspect(imageAspect) : FRAMES),
    [source, imageAspect],
  );
  const frame = compatibleFrames.find((f) => f.id === frameId) ?? compatibleFrames[0] ?? FRAMES[0]!;
  const cost = FRAME_CREDIT_COST[frame.tier];

  useEffect(() => {
    if (!compatibleFrames.some((f) => f.id === frameId)) {
      setFrameId(compatibleFrames[0]?.id ?? "polaroid");
    }
  }, [source, compatibleFrames, frameId]);

  useEffect(() => {
    if (!source || phase !== "edit") {
      if (!source) setPreviewUrl(null);
      return;
    }
    const t = window.setTimeout(() => {
      try {
        const c = composeFrame(source, frame, controls, 900, false);
        setPreviewUrl(c.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        console.error(e);
      }
    }, 40);
    return () => window.clearTimeout(t);
  }, [source, frame, controls, phase]);

  useEffect(() => {
    if (!source || phase === "idle") {
      setThumbCache({});
      return;
    }
    let cancelled = false;
    const cache: Record<string, string> = {};
    const run = async () => {
      const list = framesForAspect(
        (source.naturalWidth || source.width) / Math.max(1, source.naturalHeight || source.height),
      );
      for (const f of list) {
        if (cancelled) return;
        try {
          const c = composeFrame(source, f, DEFAULT_CONTROLS, 120, false);
          cache[f.id] = c.toDataURL("image/jpeg", 0.75);
        } catch {
          /* skip */
        }
        if (Object.keys(cache).length % 5 === 0) {
          setThumbCache({ ...cache });
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      if (!cancelled) setThumbCache({ ...cache });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [source, sourceKey, phase]);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 2400);
    return () => window.clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (!paid) setWantWm(true);
  }, [paid]);

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
      setSourceKey((k) => k + 1);
      setResultUrl(null);
      setPhase("edit");
      setAdjustOpen(false);
      setMsg("Photo loaded");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMsg("Could not load image");
    };
    img.src = url;
  }, []);

  const onApply = async () => {
    if (!source || applyLock.current || applying) return;
    applyLock.current = true;
    setApplying(true);
    try {
      // Compose first — never charge for a failed composition
      let composed: HTMLCanvasElement;
      try {
        const edgePre = Math.min(2048, Math.max(source.naturalWidth, source.naturalHeight, 1200));
        composed = composeFrame(source, frame, controls, edgePre, !paid || wantWm);
        if (!composed || composed.width < 8 || composed.height < 8) {
          toast.error("Composition failed");
          return;
        }
      } catch (ce) {
        console.error(ce);
        toast.error("Composition failed");
        return;
      }

      const res = await chargeApply({ data: { frameId: frame.id } });

      if (!res || typeof res !== "object") {
        toast.error("Could not verify credits");
        return;
      }

      if (!("ok" in res) || !res.ok) {
        const r = res as { reason?: string; message?: string };
        if (r.reason === "auth") {
          toast.error(r.message || "Sign in to apply frames");
          return;
        }
        if (r.reason === "plan") {
          toast.error(r.message || "Upgrade required for this frame");
          void navigate({ to: "/pricing" });
          return;
        }
        if (r.reason === "credits") {
          toast.error(r.message || "Not enough credits");
          void navigate({ to: "/pricing" });
          return;
        }
        toast.error(r.message || "Apply failed");
        return;
      }

      const charged = (res as { charged?: number }).charged ?? 0;
      if (charged > 0) toast.success(`${frame.name} · ${charged} credits`);
      else if ((res as { admin?: boolean }).admin) toast.success(`${frame.name} · admin`);

      try {
        await refreshProfile?.();
      } catch {
        /* ignore */
      }

      const url = composed.toDataURL("image/jpeg", 0.94);
      setResultUrl(url);
      setPhase("result");
      setAdjustOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Apply failed — try again");
    } finally {
      setApplying(false);
      applyLock.current = false;
    }
  };

  const rebuildResult = useCallback(
    (wm: boolean) => {
      if (!source) return;
      const edge = Math.min(2048, Math.max(source.naturalWidth, source.naturalHeight, 1200));
      const c = composeFrame(source, frame, controls, edge, wm);
      setResultUrl(c.toDataURL("image/jpeg", 0.94));
    },
    [source, frame, controls],
  );

  const onExport = async () => {
    if (!resultUrl) {
      setMsg("Apply a frame first");
      return;
    }
    setExporting(true);
    try {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `motio2edit-frames-${frame.id}.jpg`;
      a.click();
      setMsg("Downloaded");
    } catch {
      setMsg("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const onShare = async () => {
    if (!resultUrl) {
      setMsg("Apply a frame first");
      return;
    }
    try {
      const blob = await (await fetch(resultUrl)).blob();
      const file = new File([blob], `motio-frames-${frame.id}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Motio2edit Frames",
          text: `Framed with ${frame.name}`,
        });
        return;
      }
      setMsg("Share not supported — use Download");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setMsg("Share cancelled");
    }
  };

  const isLight = theme === "light";
  const vars = useMemo(
    () =>
      ({
        ["--frames-bg" as string]: isLight ? "#F7F5F2" : "#0A0A0A",
        ["--frames-surface" as string]: isLight ? "#FFFFFF" : "#141414",
        ["--frames-glass" as string]: isLight
          ? "rgba(255,255,255,0.72)"
          : "rgba(20,20,20,0.72)",
        ["--frames-text" as string]: isLight ? "#111111" : "#FFFFFF",
        ["--frames-muted" as string]: isLight ? "#666666" : "#A1A1AA",
        ["--frames-border" as string]: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
        ["--frames-preview" as string]: isLight ? "#EDEAE6" : "#000000",
        background: "var(--frames-bg)",
        color: "var(--frames-text)",
      }) as React.CSSProperties,
    [isLight],
  );

  return (
    <div
      className={cn(
        "relative flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none",
        isLight ? "theme-light" : "theme-dark",
      )}
      style={vars}
    >
      <header
        className="z-30 flex h-14 shrink-0 items-center justify-between border-b px-2"
        style={{
          borderColor: "var(--frames-border)",
          background: "var(--frames-glass)",
          backdropFilter: "blur(16px)",
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
            <path
              d="M3 10h6V3M22 3v6h7M29 22h-7v7M10 29V22H3"
              stroke="#8B5E3C"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
            <rect x="9" y="9" width="14" height="14" rx="1.5" fill="#C4A484" opacity="0.35" />
          </svg>
          <h1 className="text-lg font-bold tracking-tight">Frames</h1>
        </div>
        <button
          type="button"
          onClick={() => toggleSiteTheme(theme)}
          className="grid h-10 w-10 place-items-center rounded-full border"
          style={{ borderColor: "var(--frames-border)" }}
          aria-label="Toggle theme"
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </header>

      <main
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3"
        style={{ background: "var(--frames-preview)" }}
      >
        {phase === "idle" || !source ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl border px-8 py-4 text-sm font-semibold shadow-lg transition active:scale-[0.98]"
            style={{
              borderColor: "var(--frames-border)",
              background: "var(--frames-glass)",
              color: "var(--frames-text)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Upload className="mr-2 inline h-4 w-4" />
            Upload your image
          </button>
        ) : phase === "result" && resultUrl ? (
          <div className="flex max-h-full w-full flex-col items-center gap-3 py-2">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.2em] text-[var(--frames-muted)]">
                🖼️ F R A M E S
              </p>
              <p className="text-[11px] text-[var(--frames-muted)]">Motio2edit</p>
            </div>
            <img
              src={resultUrl}
              alt="Framed result"
              className="mx-auto max-h-[min(52dvh,520px)] w-auto object-contain transition-opacity duration-300"
            />
          </div>
        ) : (
          <div className="relative max-h-full max-w-full">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Framed preview"
                className="mx-auto max-h-[min(48dvh,480px)] w-auto object-contain transition-opacity duration-200"
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          onPick(f);
        }}
      />

      {phase === "edit" && source && (
        <footer
          className="z-20 shrink-0 border-t px-3 pt-2"
          style={{
            borderColor: "var(--frames-border)",
            background: "var(--frames-glass)",
            backdropFilter: "blur(20px)",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {compatibleFrames.map((f) => (
              <FrameThumb
                key={f.id}
                frame={f}
                active={f.id === frame.id}
                thumbUrl={thumbCache[f.id] ?? null}
                onSelect={() => setFrameId(f.id)}
              />
            ))}
          </div>

          {adjustOpen && (
            <div
              className="mb-3 space-y-3 rounded-2xl border p-3"
              style={{
                borderColor: "var(--frames-border)",
                background: isLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.35)",
              }}
            >
              <SliderRow label="Border" value={controls.borderWidth} min={4} max={60} step={1} onChange={(borderWidth) => setControls((c) => ({ ...c, borderWidth }))} />
              <SliderRow label="Padding" value={controls.padding} min={0} max={48} step={1} onChange={(padding) => setControls((c) => ({ ...c, padding }))} />
              <SliderRow label="Round" value={controls.round} min={0} max={32} step={1} onChange={(round) => setControls((c) => ({ ...c, round }))} />
              <SliderRow label="Texture" value={controls.texture} min={0} max={100} step={1} onChange={(texture) => setControls((c) => ({ ...c, texture }))} />
              <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--frames-muted)]">
                <input
                  type="checkbox"
                  checked={controls.shadowOn}
                  onChange={(e) => setControls((c) => ({ ...c, shadowOn: e.target.checked }))}
                  className="accent-[#FF5A1F]"
                />
                Shadow
              </label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: "var(--frames-border)" }}
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={() => setAdjustOpen((o) => !o)}
              className="grid h-10 w-10 place-items-center rounded-full border"
              style={{ borderColor: "var(--frames-border)" }}
              aria-label="Adjust"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={() => void onApply()}
              className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40"
            >
              {applying ? "Applying…" : `Apply · ${cost} credits`}
            </button>
          </div>
        </footer>
      )}

      {phase === "result" && resultUrl && (
        <footer
          className="z-20 shrink-0 border-t px-3 pt-3"
          style={{
            borderColor: "var(--frames-border)",
            background: "var(--frames-glass)",
            backdropFilter: "blur(20px)",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPhase("edit");
                setResultUrl(null);
              }}
              className="rounded-full border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--frames-border)" }}
            >
              Edit again
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => void onExport()}
              className="flex items-center gap-2 rounded-full bg-[#FF5A1F] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "…" : "Download"}
            </button>
            <button
              type="button"
              onClick={() => void onShare()}
              className="grid h-10 w-10 place-items-center rounded-full border"
              style={{ borderColor: "var(--frames-border)" }}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex justify-center">
            {paid ? (
              <label
                className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium"
                style={{ borderColor: "var(--frames-border)" }}
              >
                <input
                  type="checkbox"
                  checked={wantWm}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setWantWm(v);
                    try {
                      localStorage.setItem("motio2edit-watermark-pref", v ? "on" : "off");
                    } catch {
                      /* ignore */
                    }
                    rebuildResult(v);
                  }}
                  className="accent-[#F5C542]"
                />
                Watermark
              </label>
            ) : (
              <span
                className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium opacity-80"
                style={{ borderColor: "var(--frames-border)" }}
              >
                🔒 Watermark
              </span>
            )}
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
