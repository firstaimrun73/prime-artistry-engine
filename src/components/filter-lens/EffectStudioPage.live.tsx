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
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#FF5A1F]"
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
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const planId = (user as { planId?: string } | null)?.planId ?? "free";
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

  const [phase, setPhase] = useState<"discover" | "edit">(pageMode === "edit" ? "edit" : "discover");
  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [intensity, setIntensity] = useState(85);
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");
  const [highlightColorId, setHighlightColorId] = useState("neutral");
  const [shadowColorId, setShadowColorId] = useState("neutral");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [watermarkOn, setWatermarkOn] = useState(true);
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

  const bumpToEdit = () => {
    if (phase !== "edit") setPhase("edit");
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      setFile(f);
      const small = downscale(rgba, 960);
      setPreviewUrl(rgbaImageToObjectUrl(small));
      setResultUrl(null);
      setPhase("edit"); setEditorTab("filter"); setAdj({ ...DEFAULT_ADJ });
      setHighlightColorId("neutral"); setShadowColorId("neutral");
      setHistory([{
        selectedId,
        intensity,
        adj: { ...DEFAULT_ADJ },
        highlightColorId: "neutral",
        shadowColorId: "neutral",
      }]);
      setHistIdx(0);
    } catch {
      toast.error("Could not load image");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!file || !selected || !sourceRgba.current) return;
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
        setResultUrl(rgbaImageToObjectUrl(out.image));
      } catch {
        /* ignore preview errors */
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    const t = setTimeout(run, 60);
    return () => { cancelled = true; clearTimeout(t); };
  }, [file, selected, intensity, kind, phase, isUnlocked, adj, highlightColorId, shadowColorId, highlightTint, shadowTint]);

  const selectFilter = (item: CatalogItem) => {
    if (!isUnlocked(item)) {
      toast.message(
        item.badge === "ai+"
          ? "Upgrade your plan to unlock AI+ filters."
          : "Upgrade your plan to Premium to use this filter.",
      );
      return;
    }
    setSelectedId(item.id);
    setIntensity(85);
    setAdj({ ...DEFAULT_ADJ });
    setHighlightColorId("neutral");
    setShadowColorId("neutral");
    bumpToEdit();
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
          ? "Upgrade your plan to unlock AI+ filters."
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
      let url = rgbaImageToObjectUrl(out.image);
      if (watermarkOn && planId === "free") {
        url = await applyOutputWatermark(url);
      }
      setResultUrl(url);
      toast.success("Filter applied");
    } catch {
      toast.error("Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `motio2edit-filter-${selectedId ?? "out"}.png`;
    a.click();
  };

  const onShare = async () => {
    if (!resultUrl) return;
    try {
      const blob = await fetch(resultUrl).then((r) => r.blob());
      const fileOut = new File([blob], "motio2edit-filter.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [fileOut] })) {
        await navigator.share({ files: [fileOut], title: "Motio2edit Filter" });
      } else {
        await onDownload();
      }
    } catch {
      /* user cancelled */
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

  // Empty catalog guard — keep page structure, show existing Loader2 language
  if (!items || items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
        <p className="text-sm text-[#6F6862]">Loading filters…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-3 pb-24 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <Link to="/studio/image" className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F0EB] text-[#2C2522]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <FiltersTitle className="truncate text-xl font-bold tracking-tight text-[#2C2522]" />
          <p className="truncate text-xs text-[#6F6862]">{subtitle}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-[#E8E0D8] bg-white/70 p-8 shadow-sm backdrop-blur">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex flex-col items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/15 text-[#FF5A1F]">{busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}</span>
            <span className="text-sm font-semibold text-[#2C2522]">Upload a photo</span>
            <span className="text-xs text-[#6F6862]">9:16 · 16:9 · 1:1 supported</span>
          </button>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-[#E8E0D8] bg-[#1a1614]">
            <div className="relative mx-auto flex max-h-[min(62vh,560px)] items-center justify-center" style={{ aspectRatio: "9/16", maxWidth: "100%" }}>
              {compare && previewUrl && resultUrl ? (
                <CompareSlider beforeSrc={previewUrl} afterSrc={resultUrl} className="h-full w-full object-contain" />
              ) : (
                <img
                  src={resultUrl || previewUrl || ""}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button type="button" onClick={undo} disabled={histIdx <= 0} className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F0EB] disabled:opacity-40" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
              <button type="button" onClick={redo} disabled={histIdx >= history.length - 1} className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F0EB] disabled:opacity-40" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setCompare((c) => !c)} className={cn("grid h-9 w-9 place-items-center rounded-full", compare ? "bg-[#FFE8DA] text-[#FF5A1F]" : "bg-[#F5F0EB]")} aria-label="Compare"><Columns2 className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => void onDownload()} disabled={!resultUrl} className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F0EB] disabled:opacity-40" aria-label="Download"><Download className="h-4 w-4" /></button>
              <button type="button" onClick={() => void onShare()} disabled={!resultUrl} className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F0EB] disabled:opacity-40" aria-label="Share"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>

          {planId === "free" && (
            <label className="mt-2 flex items-center gap-2 text-xs text-[#6F6862]">
              <input type="checkbox" checked={watermarkOn} onChange={(e) => setWatermarkOn(e.target.checked)} className="accent-[#FF5A1F]" />
              Watermark on download (free plan)
            </label>
          )}

          <div className="mt-4 rounded-3xl border border-[#E8E0D8] bg-white/70 p-3 shadow-sm backdrop-blur">
            <div className="mb-2 flex gap-2">
              <button type="button" onClick={() => setEditorTab("filter")} className={cn("flex-1 rounded-xl py-2 text-sm font-semibold", editorTab === "filter" ? "bg-[#FFE8DA] text-[#FF5A1F]" : "bg-[#F5F0EB] text-[#6F6862]")}>Filters</button>
              <button type="button" onClick={() => setEditorTab("adjust")} className={cn("flex-1 rounded-xl py-2 text-sm font-semibold", editorTab === "adjust" ? "bg-[#FFE8DA] text-[#FF5A1F]" : "bg-[#F5F0EB] text-[#6F6862]")}>Adjust</button>
            </div>

            {editorTab === "filter" && (
              <div className="space-y-3">
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
                                  <span className="absolute right-1 top-1 rounded bg-[#FF5A1F] px-1 text-[9px] font-bold text-white">AI+</span>
                                ) : (
                                  <span className="absolute right-1 top-1 rounded bg-[#2C2522] px-1 text-[9px] font-bold text-white">Premium</span>
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
              <div className="space-y-3">
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
                    <OrangeSlider value={adj[adjKey]} min={adjMeta.min} max={adjMeta.max} ariaLabel={adjMeta.label} onChange={(v) => { bumpToEdit(); setAdj((prev) => { const next = { ...prev, [adjKey]: v }; pushHistoryDebounced({ selectedId, intensity, adj: next, highlightColorId, shadowColorId }); return next; }); }} />
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
                              bumpToEdit();
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
