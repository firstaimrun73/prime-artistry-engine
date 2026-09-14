/**
 * Motio2edit Filters editor — production UI.
 * Uses filter-editor-core for Adjust pipeline + output-only watermark.
 * Header locked. No implementation disclosure. No filter credits.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Columns2,
  Download,
  ImagePlus,
  Loader2,
  Redo2,
  RotateCcw,
  Share2,
  Undo2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";
import {
  fileToRGBAImage,
  rgbaImageToObjectUrl,
  downscale,
} from "@/lib/filter-lens/client/image-bridge";
import {
  applyProcessingProfile,
  renderFullResolution,
} from "@/lib/filter-lens/filters/filter-engine";
import { getFilterById } from "@/lib/filter-lens/filters/filter-registry";
import type { RGBAImage } from "@/lib/filter-lens/shared/processing-types";
import { CompareSlider } from "@/components/CompareSlider";
import {
  type CatalogItem,
  filterToCatalogItem,
  type AdjustValues,
  type AdjustKey,
  DEFAULT_ADJ,
  COLOR_SWATCHES,
  ADJUST_META,
  applyUserAdjustments,
  hasAdj,
  applyOutputWatermark,
} from "./filter-editor-core";

export type { CatalogItem };
export { filterToCatalogItem };

type Props = {
  kind: "filter" | "lens";
  pageMode: "discover" | "edit";
  title: string;
  subtitle: string;
  items: CatalogItem[];
  categories: string[];
  initialSelectedId?: string | null;
};

function FiltersTitle({ className }: { className?: string }) {
  return (
    <h1 className={className}>
      F
      <span className="relative inline-block">
        i
        <svg className="pointer-events-none absolute -right-1.5 -top-1 h-2.5 w-2.5 text-[#FF5A1F]" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M6 0.5l0.7 3.2 3.3.2-2.5 2.2.8 3.2L6 7.5 3.7 9.3l.8-3.2L2 3.9l3.3-.2L6 0.5z" opacity="0.9" />
        </svg>
      </span>
      lters
    </h1>
  );
}

function OrangeSlider({
  value, min, max, onChange, ariaLabel,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void; ariaLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E8E0D8] accent-[#FF5A1F] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#FF5A1F] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#FF5A1F]"
      style={{ background: `linear-gradient(to right, #FF5A1F 0%, #FF5A1F ${pct}%, #E8E0D8 ${pct}%, #E8E0D8 100%)` }}
    />
  );
}

export function EffectStudioPage({
  kind,
  pageMode,
  title,
  subtitle,
  items,
  categories,
  initialSelectedId = null,
}: Props) {
  const { profile, user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const freeUser = !isAdmin && (!profile || profile.plan === "free" || !profile.plan);
  const planId = (profile as { plan?: string } | null)?.plan ?? "free";
  const canUseAiPlus = isAdmin || ["lite", "plus", "pro", "studio", "business"].includes(planId);
  const canUsePremium = isAdmin || ["pro", "studio", "business"].includes(planId);

  const isUnlocked = useCallback(
    (item: CatalogItem) => {
      if (isAdmin || item.isFree === true) return true;
      if (item.badge === "ai+") return canUseAiPlus;
      if (item.badge === "premium" || item.badge === "pro") return canUsePremium;
      return canUsePremium;
    },
    [isAdmin, canUseAiPlus, canUsePremium],
  );

  const preferred = ["Natural", "Portrait", "Cinematic", "Film", "Vintage", "Moody", "Comic", "Sketch", "Retro", "Art", "Neon", "Black & White"];
  const orderedCategories = useMemo(() => {
    const set = new Set(categories);
    const head = preferred.filter((c) => set.has(c));
    const rest = categories.filter((c) => !preferred.includes(c));
    return [...head, ...rest];
  }, [categories]);

  const [phase, setPhase] = useState<"discover" | "edit" | "result">(pageMode === "edit" ? "edit" : "discover");
  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [intensity, setIntensity] = useState(85);
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");
  const [highlightColorId, setHighlightColorId] = useState("neutral");
  const [shadowColorId, setShadowColorId] = useState("neutral");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultWmUrl, setResultWmUrl] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wmEnabled, setWmEnabled] = useState(true);
  const [history, setHistory] = useState<Array<{ selectedId: string | null; intensity: number; adj: AdjustValues; highlightColorId: string; shadowColorId: string }>>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const sourceRgba = useRef<RGBAImage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const histTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);
  const highlightTint = useMemo(() => {
    const s = COLOR_SWATCHES.find((x) => x.id === highlightColorId);
    return s && s.id !== "neutral" ? s.rgb : null;
  }, [highlightColorId]);
  const shadowTint = useMemo(() => {
    const s = COLOR_SWATCHES.find((x) => x.id === shadowColorId);
    return s && s.id !== "neutral" ? s.rgb : null;
  }, [shadowColorId]);

  const pushHistory = useCallback((snap: { selectedId: string | null; intensity: number; adj: AdjustValues; highlightColorId: string; shadowColorId: string }) => {
    setHistory((prev) => {
      const next = prev.slice(0, histIdx + 1);
      next.push(snap);
      return next.slice(-40);
    });
    setHistIdx((i) => Math.min(i + 1, 39));
  }, [histIdx]);

  const pushHistoryDebounced = useCallback((snap: { selectedId: string | null; intensity: number; adj: AdjustValues; highlightColorId: string; shadowColorId: string }) => {
    if (histTimer.current) clearTimeout(histTimer.current);
    histTimer.current = setTimeout(() => pushHistory(snap), 280);
  }, [pushHistory]);

  const undo = () => {
    if (histIdx <= 0) return;
    const nextIdx = histIdx - 1;
    const snap = history[nextIdx];
    if (!snap) return;
    setHistIdx(nextIdx);
    setSelectedId(snap.selectedId);
    setIntensity(snap.intensity);
    setAdj({ ...snap.adj });
    setHighlightColorId(snap.highlightColorId);
    setShadowColorId(snap.shadowColorId);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const nextIdx = histIdx + 1;
    const snap = history[nextIdx];
    if (!snap) return;
    setHistIdx(nextIdx);
    setSelectedId(snap.selectedId);
    setIntensity(snap.intensity);
    setAdj({ ...snap.adj });
    setHighlightColorId(snap.highlightColorId);
    setShadowColorId(snap.shadowColorId);
  };

  const onRestart = () => {
    setSourceUrl(null);
    setProcessedUrl(null);
    setResultUrl(null);
    setResultWmUrl(null);
    sourceRgba.current = null;
    setPhase("discover");
    setSelectedId(null);
    setAdj({ ...DEFAULT_ADJ });
    setIntensity(85);
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      const small = downscale(rgba, 960);
      const url = rgbaImageToObjectUrl(small);
      setSourceUrl(url);
      setProcessedUrl(null);
      setResultUrl(null);
      setResultWmUrl(null);
      setPhase("edit");
      setEditorTab("filter");
      setAdj({ ...DEFAULT_ADJ });
      setHighlightColorId("neutral");
      setShadowColorId("neutral");
      setHistory([{ selectedId, intensity, adj: { ...DEFAULT_ADJ }, highlightColorId: "neutral", shadowColorId: "neutral" }]);
      setHistIdx(0);
    } catch {
      toast.error("Could not load image");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!sourceUrl || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) return;
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const def = getFilterById(selected.id);
        if (!def) return;
        let out = applyProcessingProfile(sourceRgba.current!, def.processingProfile, {
          intensity,
          mode: "preview",
          previewMaxDimension: 720,
          isCancelled: () => cancelled,
        });
        if (cancelled || out.cancelled) return;
        if (hasAdj(adj) || highlightTint || shadowTint) {
          out = { ...out, image: applyUserAdjustments(out.image, adj, highlightTint, shadowTint) };
        }
        if (cancelled) return;
        setProcessedUrl(rgbaImageToObjectUrl(out.image));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    const t = setTimeout(run, 60);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sourceUrl, selected, intensity, isUnlocked, adj, highlightTint, shadowTint]);

  const selectFilter = (item: CatalogItem) => {
    if (!isUnlocked(item)) {
      toast.message(
        item.badge === "ai+"
          ? "Upgrade your plan to use AI+ filters."
          : "Upgrade your plan to Premium to use this filter.",
      );
      return;
    }
    setSelectedId(item.id);
    setIntensity(85);
    setAdj({ ...DEFAULT_ADJ });
    setHighlightColorId("neutral");
    setShadowColorId("neutral");
    if (phase === "discover") setPhase("edit");
    pushHistory({
      selectedId: item.id,
      intensity: 85,
      adj: { ...DEFAULT_ADJ },
      highlightColorId: "neutral",
      shadowColorId: "neutral",
    });
  };

  const onApply = async () => {
    if (!selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) {
      toast.message(
        selected.badge === "ai+"
          ? "Upgrade your plan to use AI+ filters."
          : "Upgrade your plan to Premium to use this filter.",
      );
      return;
    }
    setBusy(true);
    try {
      const def = getFilterById(selected.id);
      if (!def) return;
      let out = renderFullResolution(sourceRgba.current, def.processingProfile, {
        intensity,
        mode: "full",
      });
      if (hasAdj(adj) || highlightTint || shadowTint) {
        out = { ...out, image: applyUserAdjustments(out.image, adj, highlightTint, shadowTint) };
      }
      const url = rgbaImageToObjectUrl(out.image);
      setResultUrl(url);
      try {
        const wm = await applyOutputWatermark(url);
        setResultWmUrl(wm);
      } catch {
        setResultWmUrl(url);
      }
      if (freeUser) setWmEnabled(true);
      setPhase("result");
      toast.success("Filter applied");
    } catch {
      toast.error("Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm ? (resultWmUrl || resultUrl) : (resultUrl || resultWmUrl);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `motio2edit-filter-${selectedId ?? "out"}.png`;
    a.click();
  };

  const onShare = async () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm ? (resultWmUrl || resultUrl) : (resultUrl || resultWmUrl);
    if (!url) return;
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const fileOut = new File([blob], "motio2edit-filter.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [fileOut] })) {
        await navigator.share({ files: [fileOut], title: "Motio2edit Filter" });
      } else {
        await onDownload();
      }
    } catch {
      /* cancelled */
    }
  };

  const resetAdjust = () => {
    setAdj({ ...DEFAULT_ADJ });
    setHighlightColorId("neutral");
    setShadowColorId("neutral");
    pushHistory({
      selectedId,
      intensity,
      adj: { ...DEFAULT_ADJ },
      highlightColorId: "neutral",
      shadowColorId: "neutral",
    });
  };

  const colorTarget = adjKey === "color" || adjKey === "hue" ? "highlight" : null;
  const showWm = freeUser || wmEnabled;
  const displayResultUrl = showWm ? (resultWmUrl || resultUrl) : (resultUrl || resultWmUrl);

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
        <p className="text-sm text-[#6F6862]">Loading filters…</p>
      </div>
    );
  }

  if (!sourceUrl) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-[#FAF7F2]">
        <header className="flex items-center gap-3 border-b border-[#E8E0D8] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/studio/image" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] bg-white" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
            <p className="truncate text-xs text-[#6F6862]">{subtitle}</p>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex w-full flex-col items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/45 bg-[#FFF1E6] px-6 py-16 transition hover:border-[#FF5A1F] hover:bg-[#FFE6DA]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/15 text-[#FF5A1F]">{busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}</span>
            <span className="text-sm font-semibold text-[#2C2522]">Upload a photo</span>
            <span className="text-xs text-[#6F6862]">9:16 · 16:9 · 1:1 supported</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-[#FAF7F2]">
      <header className="flex items-center gap-3 border-b border-[#E8E0D8] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/studio/image" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] bg-white" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 text-xs font-semibold">
          <ImagePlus className="h-3.5 w-3.5" /> Change
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#1a1614] px-2 py-2">
        {phase === "result" && sourceUrl && displayResultUrl ? (
          comparing ? (
            <CompareSlider before={sourceUrl} after={displayResultUrl} className="h-full max-h-full w-full max-w-full" />
          ) : (
            <img src={displayResultUrl} alt="Result" className="h-auto max-h-full w-auto max-w-full rounded-xl object-contain" draggable={false} />
          )
        ) : (
          <img src={processedUrl || sourceUrl!} alt="Preview" className="h-auto max-h-full w-auto max-w-full rounded-xl object-contain" draggable={false} />
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          </div>
        )}
      </div>

      {phase === "result" ? (
        <div className="shrink-0 border-t border-[#E8E0D8] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-center gap-3">
            <button type="button" onClick={onRestart} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button type="button" onClick={() => setComparing((v) => !v)} className={cn("grid h-11 w-11 place-items-center rounded-xl", comparing && "bg-[#FFE6DA] text-[#FF5A1F]")} aria-label="Compare"><Columns2 className="h-5 w-5" /></button>
            <button type="button" onClick={() => void onDownload()} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Download"><Download className="h-5 w-5" /></button>
            <button type="button" onClick={() => void onShare()} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Share"><Share2 className="h-5 w-5" /></button>
            <button
              type="button"
              disabled={freeUser}
              onClick={() => {
                if (freeUser) { toast.message("Free plan watermark cannot be removed"); return; }
                setWmEnabled((v) => !v);
              }}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold",
                freeUser ? "cursor-not-allowed border-[#E8E0D8] bg-[#F5F0EB] text-[#6F6862] opacity-90" : showWm ? "border-[#FF5A1F]/40 bg-[#FFE8DA] text-[#FF5A1F]" : "border-[#E8E0D8] bg-white text-[#161412]",
              )}
              aria-label={freeUser ? "Watermark locked on free plan" : "Toggle watermark"}
            >
              Watermark
              {freeUser ? <span className="text-[10px] font-medium opacity-80">Locked</span> : null}
            </button>
          </div>
          {freeUser ? <p className="text-center text-[10px] text-[#6F6862]">Free plan includes Motio2edit watermark</p> : null}
          <button type="button" onClick={() => setPhase("edit")} className="mt-2 flex w-full items-center justify-center rounded-2xl border border-[#E8E0D8] bg-white py-3 text-sm font-semibold">
            Edit again
          </button>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-center gap-10 border-t border-[#E8E0D8]/80 bg-white/90 px-4 py-1.5 backdrop-blur-sm">
            <button type="button" onClick={undo} disabled={histIdx <= 0} className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
            <button type="button" onClick={redo} disabled={histIdx >= history.length - 1} className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
          </div>
          <div className="shrink-0 border-t border-[#E8E0D8]/60 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
            <div className="mb-2 flex gap-2 px-3">
              <button type="button" onClick={() => setEditorTab("filter")} className={cn("flex-1 rounded-xl py-2 text-sm font-semibold", editorTab === "filter" ? "bg-[#FFE8DA] text-[#FF5A1F]" : "bg-[#F5F0EB] text-[#6F6862]")}>Filters</button>
              <button type="button" onClick={() => setEditorTab("adjust")} className={cn("flex-1 rounded-xl py-2 text-sm font-semibold", editorTab === "adjust" ? "bg-[#FFE8DA] text-[#FF5A1F]" : "bg-[#F5F0EB] text-[#6F6862]")}>Adjust</button>
            </div>
            {editorTab === "filter" && (
              <div className="space-y-3 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#6F6862]">Intensity</span>
                  <OrangeSlider value={intensity} min={0} max={100} ariaLabel="Intensity" onChange={(v) => { setIntensity(v); pushHistoryDebounced({ selectedId, intensity: v, adj, highlightColorId, shadowColorId }); }} />
                </div>
                {orderedCategories.map((cat) => {
                  const catItems = items.filter((i) => i.category === cat);
                  if (!catItems.length) return null;
                  return (
                    <div key={cat}>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#6F6862]">{cat}</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {catItems.map((item) => (
                          <button key={item.id} type="button" onClick={() => selectFilter(item)} className="w-[78px] shrink-0 text-left">
                            <div className={cn("relative h-16 overflow-hidden rounded-xl border-2", selectedId === item.id ? "border-[#FF5A1F]" : "border-transparent", !item.isFree && !isUnlocked(item) ? "opacity-60" : "")}>
                              <div className="h-full w-full bg-gradient-to-br from-[#F5F0EB] to-[#E8E0D8]" />
                              {!item.isFree && item.badge && (
                                item.badge === "ai+" ? (
                                  <span className="absolute left-1 top-1 inline-flex items-center rounded bg-[#FF5A1F]/95 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white ring-1 ring-[#FF5A1F]/50">AI+</span>
                                ) : (
                                  <span className="absolute left-1 top-1 inline-flex items-center rounded bg-[#2C2522]/90 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">Premium</span>
                                )
                              )}
                            </div>
                            <p className="mt-1 truncate text-[10px] font-semibold text-[#2C2522]">{item.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button type="button" disabled={busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white disabled:opacity-40">
                  {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>) : ("Apply filter")}
                </button>
              </div>
            )}
            {editorTab === "adjust" && (
              <div className="space-y-3 px-3">
                <div className="flex gap-1 overflow-x-auto">
                  {ADJUST_META.map((m) => {
                    const active = adjKey === m.key;
                    const Icon = m.icon;
                    return (
                      <button key={m.key} type="button" onClick={() => setAdjKey(m.key)} className={cn("flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold", active ? "bg-[#FFE8DA] text-[#FF5A1F]" : "bg-[#F5F0EB] text-[#6F6862]")}>
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const adjMeta = ADJUST_META.find((m) => m.key === adjKey)!;
                  return (
                    <OrangeSlider value={adj[adjKey]} min={adjMeta.min} max={adjMeta.max} ariaLabel={adjMeta.label} onChange={(v) => { setAdj((prev) => { const next = { ...prev, [adjKey]: v }; pushHistoryDebounced({ selectedId, intensity, adj: next, highlightColorId, shadowColorId }); return next; }); }} />
                  );
                })()}
                {(adjKey === "color" || adjKey === "hue") && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-[#6F6862]">Tint</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_SWATCHES.map((s) => {
                        const activeId = colorTarget === "highlight" ? highlightColorId : shadowColorId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              if (colorTarget === "highlight") {
                                setHighlightColorId(s.id);
                                pushHistory({ selectedId, intensity, adj: { ...adj }, highlightColorId: s.id, shadowColorId });
                              } else {
                                setShadowColorId(s.id);
                                pushHistory({ selectedId, intensity, adj: { ...adj }, highlightColorId, shadowColorId: s.id });
                              }
                            }}
                            className={cn("h-7 w-7 rounded-full border-2", activeId === s.id ? "border-white shadow-[0_0_0_2px_#FF5A1F] scale-110" : "border-transparent")}
                            style={{ background: `rgb(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]})` }}
                            aria-label={s.id}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                <button type="button" onClick={resetAdjust} className="text-center text-xs text-[#6F6862] underline">Reset adjustments</button>
                <button type="button" disabled={busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white disabled:opacity-40">
                  {busy ? "Applying…" : "Apply filter"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
