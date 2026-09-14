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
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className="relative flex h-8 flex-1 items-center">
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-[#E8E0D8] dark:bg-[#2A2826]" />
      <div className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[#FF5A1F]" style={{ width: `${pct}%` }} />
      <input type="range" min={min} max={max} step={1} value={value} aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#FF5A1F] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#FF5A1F] [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
      />
    </div>
  );
}

export function EffectStudioPage({
  kind, pageMode: _pageMode, title, subtitle: _subtitle, items, categories, initialSelectedId = null,
}: Props) {
  const { profile, user } = useAuth();
  const isAdmin = isAdminEmail(user?.email ?? profile?.email);
  const freeUser = !isAdmin && (!profile || profile.plan === "free" || !profile.plan);
  const planId = (profile as { plan?: string } | null)?.plan ?? "free";
  const canUseAiPlus = isAdmin || ["lite", "plus", "pro", "studio", "business"].includes(planId);
  const canUsePremium = isAdmin || ["pro", "studio", "business"].includes(planId);
  const [category, setCategory] = useState<string | "all">("all");
  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");
  const [colorTarget, setColorTarget] = useState<"highlight" | "shadow">("highlight");
  const [highlightColorId, setHighlightColorId] = useState("neutral");
  const [shadowColorId, setShadowColorId] = useState("neutral");
  type EditSnapshot = {
    selectedId: string | null;
    intensity: number;
    adj: AdjustValues;
    highlightColorId: string;
    shadowColorId: string;
  };
  const historyRef = useRef<EditSnapshot[]>([]);
  const historyIdxRef = useRef(-1);
  const [historyTick, setHistoryTick] = useState(0);
  const histDebounceRef = useRef<number | null>(null);
  const sortedCategories = useMemo(() => {
    const preferred = ["Natural", "Portrait", "Cinematic", "Film", "Vintage", "Moody", "Comic", "Sketch", "Retro", "Art", "Neon", "Black & White"];
    const head = preferred.filter((c) => categories.includes(c));
    const rest = categories.filter((c) => !preferred.includes(c));
    return [...head, ...rest];
  }, [categories]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultWmUrl, setResultWmUrl] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(85);
  const [busy, setBusy] = useState(false);
  const [thumbsBusy, setThumbsBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "edit" | "result">("idle");
  const [comparing, setComparing] = useState(false);
  const [wmEnabled, setWmEnabled] = useState(true);
  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);
  const thumbGen = useRef(0);
  const sourceRgba = useRef<RGBAImage | null>(null);
  const thumbRgba = useRef<RGBAImage | null>(null);
  const selectLock = useRef(false);
  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);
  const isUnlocked = useCallback((item: CatalogItem) => {
    if (isAdmin || item.isFree === true) return true;
    if (item.badge === "ai+") return canUseAiPlus;
    if (item.badge === "premium" || item.badge === "pro") return canUsePremium;
    return canUsePremium;
  }, [isAdmin, canUseAiPlus, canUsePremium]);
  const filtered = useMemo(() => (category === "all" ? items : items.filter((i) => i.category === category)), [items, category]);
  const highlightTint = useMemo(() => {
    const sw = COLOR_SWATCHES.find((s) => s.id === highlightColorId);
    if (!sw || sw.id === "neutral") return null;
    return sw.rgb;
  }, [highlightColorId]);
  const shadowTint = useMemo(() => {
    const sw = COLOR_SWATCHES.find((s) => s.id === shadowColorId);
    if (!sw || sw.id === "neutral") return null;
    return sw.rgb;
  }, [shadowColorId]);
  const revokeUrl = (url: string | null | undefined) => { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); };
  const clearThumbs = () => { setThumbMap((prev) => { for (const u of Object.values(prev)) revokeUrl(u); return {}; }); };
  const pushHistory = useCallback((snap: EditSnapshot) => {
    const stack = historyRef.current.slice(0, historyIdxRef.current + 1);
    const last = stack[stack.length - 1];
    if (last && last.selectedId === snap.selectedId && last.intensity === snap.intensity && last.highlightColorId === snap.highlightColorId && last.shadowColorId === snap.shadowColorId && JSON.stringify(last.adj) === JSON.stringify(snap.adj)) return;
    stack.push(snap);
    if (stack.length > 40) stack.shift();
    historyRef.current = stack;
    historyIdxRef.current = stack.length - 1;
    setHistoryTick((t) => t + 1);
  }, []);
  const pushHistoryDebounced = useCallback((snap: EditSnapshot) => {
    if (histDebounceRef.current) window.clearTimeout(histDebounceRef.current);
    histDebounceRef.current = window.setTimeout(() => { pushHistory(snap); histDebounceRef.current = null; }, 280);
  }, [pushHistory]);
  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current >= 0 && historyIdxRef.current < historyRef.current.length - 1;
  void historyTick;
  const bumpToEdit = () => {
    if (phase === "result") {
      setPhase("edit");
      setResultUrl((prev) => { revokeUrl(prev); return null; });
      setResultWmUrl((prev) => { revokeUrl(prev); return null; });
      setComparing(false);
    }
  };
  const applySnapshot = (snap: EditSnapshot) => {
    setSelectedId(snap.selectedId);
    setIntensity(snap.intensity);
    setAdj({ ...snap.adj });
    setHighlightColorId(snap.highlightColorId);
    setShadowColorId(snap.shadowColorId);
  };
  const onUndo = () => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const snap = historyRef.current[historyIdxRef.current];
    if (snap) applySnapshot(snap);
    setHistoryTick((t) => t + 1);
    bumpToEdit();
  };
  const onRedo = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const snap = historyRef.current[historyIdxRef.current];
    if (snap) applySnapshot(snap);
    setHistoryTick((t) => t + 1);
    bumpToEdit();
  };
  const onPick = async (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) { toast.error("Please choose an image (JPG, PNG, WebP)"); return; }
    setBusy(true);
    try {
      revokeUrl(sourceUrl); revokeUrl(previewUrl); revokeUrl(resultUrl); revokeUrl(resultWmUrl); clearThumbs();
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      thumbRgba.current = downscale(rgba, 160);
      const url = URL.createObjectURL(f);
      setFile(f); setSourceUrl(url); setPreviewUrl(null); setResultUrl(null); setResultWmUrl(null);
      setPhase("edit"); setEditorTab("filter"); setAdj({ ...DEFAULT_ADJ });
      setHighlightColorId("neutral"); setShadowColorId("neutral"); setColorTarget("highlight");
      setComparing(false);
      const initId = selectedId || items[0]?.id || null;
      const initIntensity = (items.find((i) => i.id === initId) as { intensityDefault?: number } | undefined)?.intensityDefault ?? 85;
      if (!selectedId && items[0]) { setSelectedId(items[0].id); setIntensity(85); }
      historyRef.current = [{ selectedId: initId, intensity: initIntensity, adj: { ...DEFAULT_ADJ }, highlightColorId: "neutral", shadowColorId: "neutral" }];
      historyIdxRef.current = 0;
      setHistoryTick((t) => t + 1);
      toast.success("Photo ready — pick a look");
    } catch (err) { console.error(err); toast.error("Could not read that photo"); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!file || !thumbRgba.current || kind !== "filter") return;
    const gen = ++thumbGen.current; let cancelled = false; setThumbsBusy(true);
    const run = async () => {
      const base = thumbRgba.current; if (!base) return;
      const batch = 8;
      for (let i = 0; i < items.length; i += batch) {
        if (cancelled || gen !== thumbGen.current) return;
        const slice = items.slice(i, i + batch);
        const next: Record<string, string> = {};
        await Promise.all(slice.map(async (item) => {
          const def = getFilterById(item.id); if (!def) return;
          try {
            const out = applyProcessingProfile(base, def.processingProfile, { intensity: 85, mode: "preview", previewMaxDimension: 160, seed: 42 });
            if (out.cancelled) return;
            next[item.id] = await rgbaImageToObjectUrl(out.image);
          } catch (e) { console.warn("[Motio2edit] thumb failed", item.id, e); }
        }));
        if (cancelled || gen !== thumbGen.current) { for (const u of Object.values(next)) revokeUrl(u); return; }
        setThumbMap((prev) => ({ ...prev, ...next }));
      }
      if (gen === thumbGen.current) setThumbsBusy(false);
    };
    void run(); return () => { cancelled = true; };
  }, [file, items, kind]);
  useEffect(() => {
    if (!file || !selected || kind !== "filter" || phase === "result") return;
    if (!isUnlocked(selected) || !sourceRgba.current) return;
    const gen = ++previewGen.current; let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const def = getFilterById(selected.id); if (!def) return;
        const scaled = downscale(sourceRgba.current!, 720);
        let out = applyProcessingProfile(scaled, def.processingProfile, { intensity, mode: "preview", previewMaxDimension: 720, seed: 42 });
        if (cancelled || gen !== previewGen.current || out.cancelled) return;
        if (hasAdj(adj, highlightColorId, shadowColorId)) {
          out = { ...out, image: applyUserAdjustments(out.image, adj, highlightTint, shadowTint) };
        }
        const url = await rgbaImageToObjectUrl(out.image);
        if (gen !== previewGen.current) { revokeUrl(url); return; }
        setPreviewUrl((prev) => { revokeUrl(prev); return url; });
      } catch (err) { console.error("[Motio2edit] preview failed", err); }
      finally { if (gen === previewGen.current) setBusy(false); }
    };
    const t = window.setTimeout(() => void run(), 60);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [file, selected, intensity, kind, phase, isUnlocked, adj, highlightColorId, shadowColorId, highlightTint, shadowTint]);
  const selectFilter = (item: CatalogItem) => {
    if (selectLock.current) return;
    selectLock.current = true;
    window.setTimeout(() => { selectLock.current = false; }, 280);
    if (!isUnlocked(item)) {
      toast.message(item.badge === "ai+" ? "AI+ filter — upgrade to unlock" : "Premium filter — upgrade to unlock");
      return;
    }
    bumpToEdit();
    setSelectedId(item.id);
    setIntensity(85);
    setEditorTab("filter");
    pushHistory({ selectedId: item.id, intensity: 85, adj: { ...adj }, highlightColorId, shadowColorId });
  };
  const onApply = async () => {
    if (!file || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) { toast.message("Unlock this filter to apply"); return; }
    setBusy(true);
    try {
      const def = getFilterById(selected.id); if (!def) throw new Error("Filter not found");
      let out = renderFullResolution(sourceRgba.current, def.processingProfile, { intensity, mode: "full", seed: 42 });
      if (out.cancelled) throw new Error("Cancelled");
      if (hasAdj(adj, highlightColorId, shadowColorId)) {
        out = { ...out, image: applyUserAdjustments(out.image, adj, highlightTint, shadowTint) };
      }
      const url = await rgbaImageToObjectUrl(out.image);
      setResultUrl((prev) => { revokeUrl(prev); return url; });
      try {
        const wm = await applyOutputWatermark(url);
        setResultWmUrl((prev) => { revokeUrl(prev); return wm; });
      } catch { setResultWmUrl(url); }
      if (freeUser) setWmEnabled(true);
      setPhase("result"); setComparing(false); toast.success("Filter applied");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Apply failed"); }
    finally { setBusy(false); }
  };
  const onRestart = () => {
    setPhase("edit");
    setResultUrl((prev) => { revokeUrl(prev); return null; });
    setResultWmUrl((prev) => { revokeUrl(prev); return null; });
    setEditorTab("filter"); setComparing(false);
  };
  const onDownload = () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm ? (resultWmUrl || resultUrl || previewUrl) : (resultUrl || resultWmUrl || previewUrl);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = `motio2edit-${selected?.name ?? "filter"}.jpg`; a.click();
  };
  const onShare = async () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm ? (resultWmUrl || resultUrl || previewUrl) : (resultUrl || resultWmUrl || previewUrl);
    if (!url) return;
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const shareFile = new File([blob], `motio2edit-${selected?.name ?? "filter"}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: "Motio2edit Filters" });
      } else { onDownload(); toast.message("Saved — share from your gallery"); }
    } catch { onDownload(); }
  };
  const resetAdjust = () => {
    setAdj({ ...DEFAULT_ADJ });
    setHighlightColorId("neutral");
    setShadowColorId("neutral");
    pushHistory({ selectedId, intensity, adj: { ...DEFAULT_ADJ }, highlightColorId: "neutral", shadowColorId: "neutral" });
  };
  const processedUrl = resultUrl || previewUrl;
  const showWm = freeUser || wmEnabled;
  const displayResultUrl = showWm ? (resultWmUrl || resultUrl) : (resultUrl || resultWmUrl);
  const hasPhoto = !!sourceUrl;
  const adjMeta = ADJUST_META.find((m) => m.key === adjKey)!;

  if (!items || items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#FFFBF7] dark:bg-[#0F0E0D]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
        <p className="text-sm text-[#6F6862] dark:text-[#A39E97]">Loading filters…</p>
      </div>
    );
  }

  if (!hasPhoto) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#FFFBF7] dark:bg-[#0F0E0D] text-[#161412] dark:text-[#F5F0EA]">
        <header className="flex items-center gap-3 border-b border-[#E8E0D8] dark:border-[#2A2826] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918]" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">Motio2edit</p>
            <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-10 min-h-0">
          <p className="mb-5 max-w-sm text-center text-sm text-[#6F6862] dark:text-[#A39E97]">AI-powered filters · live preview on your photo</p>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex w-full flex-col items-center gap-3 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/40 bg-[#FFF1E6] dark:bg-[#1A1510] px-6 py-14 text-[#FF5A1F] transition active:scale-[0.99]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/25">{busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}</span>
            <span className="text-base font-semibold">Drop image or tap to upload</span>
            <span className="max-w-xs text-center text-sm text-[#6F6862] dark:text-[#A39E97]">Looks unlock after you upload</span>
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FFFBF7] dark:bg-[#0F0E0D] text-[#161412] dark:text-[#F5F0EA]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918]" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo} className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] disabled:opacity-40" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] disabled:opacity-40" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#F5F0EA] dark:bg-black/40">
        {comparing && sourceUrl && processedUrl ? (
          <CompareSlider before={sourceUrl} after={processedUrl} className="h-full max-h-[min(52vh,520px)] w-full" />
        ) : (
          <img
            src={phase === "result" ? (displayResultUrl || processedUrl || sourceUrl)! : (previewUrl || sourceUrl)!}
            alt="Preview"
            className="mx-auto max-h-[min(52vh,520px)] w-full object-contain"
          />
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/25">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {phase === "result" ? (
        <div className="border-t border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => setComparing((c) => !c)} className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] px-3 py-2 text-sm font-medium">
                <Columns2 className="h-4 w-4" /> Compare
              </button>
              <button type="button" onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white">
                <Download className="h-4 w-4" /> Download
              </button>
              <button type="button" onClick={() => void onShare()} className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] px-3 py-2 text-sm font-medium">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button type="button" onClick={onRestart} className="text-sm font-medium text-[#6F6862] dark:text-[#A39E97]">Edit again</button>
            </div>
            <label className="flex items-center justify-center gap-2 text-xs text-[#6F6862] dark:text-[#A39E97]">
              <input type="checkbox" checked={showWm} disabled={freeUser} onChange={(e) => {
                if (freeUser) { toast.message("Free plan watermark cannot be removed"); return; }
                setWmEnabled(e.target.checked);
              }} />
              Watermark
            </label>
            {freeUser ? <p className="text-center text-[10px] text-[#6F6862] dark:text-[#A39E97]">Free plan includes Motio2edit watermark</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 border-t border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918] px-3 py-2">
            <button type="button" onClick={() => setEditorTab("filter")} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", editorTab === "filter" ? "bg-[#FF5A1F] text-white" : "text-[#6F6862] dark:text-[#A39E97]")}>Filters</button>
            <button type="button" onClick={() => setEditorTab("adjust")} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", editorTab === "adjust" ? "bg-[#FF5A1F] text-white" : "text-[#6F6862] dark:text-[#A39E97]")}>Adjust</button>
          </div>

          {editorTab === "filter" && (
            <div className="bg-white dark:bg-[#1A1918] px-3 pb-2">
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                <button type="button" onClick={() => setCategory("all")} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === "all" ? "bg-[#FF5A1F] text-white" : "border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918]")}>All</button>
                {sortedCategories.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === c ? "bg-[#FF5A1F] text-white" : "border border-[#E8E0D8] dark:border-[#2A2826] bg-white dark:bg-[#1A1918]")}>{c}</button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {filtered.map((item) => {
                  const locked = !isUnlocked(item);
                  const active = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectFilter(item)}
                      className={cn(
                        "relative shrink-0 w-[72px] overflow-hidden rounded-xl border-2 transition",
                        active ? "border-[#FF5A1F]" : "border-[#E8E0D8] dark:border-[#2A2826]",
                        locked && "opacity-70",
                      )}
                    >
                      <div className="aspect-square w-full bg-[#F5F0EA] dark:bg-[#0F0E0D]">
                        {thumbMap[item.id] ? (
                          <img src={thumbMap[item.id]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-[10px] text-[#6F6862] dark:text-[#A39E97]">{thumbsBusy ? "…" : item.name.slice(0, 3)}</div>
                        )}
                      </div>
                      <p className="truncate px-1 py-0.5 text-center text-[10px] font-medium">{item.name}</p>
                      {item.badge && (
                        <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[8px] font-bold uppercase text-white">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="w-16 shrink-0 text-[11px] font-semibold text-[#6F6862] dark:text-[#A39E97]">Intensity</span>
                <OrangeSlider value={intensity} min={0} max={100} onChange={(v) => { bumpToEdit(); setIntensity(v); pushHistoryDebounced({ selectedId, intensity: v, adj: { ...adj }, highlightColorId, shadowColorId }); }} ariaLabel="Intensity" />
                <span className="w-8 text-right text-xs font-semibold">{intensity}</span>
              </div>
              <button type="button" disabled={busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40">
                {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>) : ("Apply filter")}
              </button>
            </div>
          )}

          {editorTab === "adjust" && (
            <div className="bg-white dark:bg-[#1A1918] px-3 pb-3">
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {ADJUST_META.map((m) => (
                  <button key={m.key} type="button" onClick={() => setAdjKey(m.key)}
                    className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", adjKey === m.key ? "bg-[#FF5A1F] text-white" : "border border-[#E8E0D8] dark:border-[#2A2826] text-[#6F6862] dark:text-[#A39E97]")}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="w-16 shrink-0 text-[11px] font-semibold text-[#6F6862] dark:text-[#A39E97]">{adjMeta.label}</span>
                <OrangeSlider
                  value={adj[adjKey]}
                  min={adjMeta.min}
                  max={adjMeta.max}
                  onChange={(v) => {
                    const next = { ...adj, [adjKey]: v };
                    setAdj(next);
                    pushHistoryDebounced({ selectedId, intensity, adj: next, highlightColorId, shadowColorId });
                  }}
                  ariaLabel={adjMeta.label}
                />
                <span className="w-8 text-right text-xs font-semibold">{adj[adjKey]}</span>
              </div>
              <button type="button" onClick={resetAdjust} className="mt-1 text-xs font-medium text-[#6F6862] dark:text-[#A39E97]">
                <RotateCcw className="mr-1 inline h-3 w-3" /> Reset adjustments
              </button>
              <button type="button" disabled={busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white disabled:opacity-40">
                {busy ? "Applying…" : "Apply filter"}
              </button>
            </div>
          )}
          <div className="h-[max(0.5rem,env(safe-area-inset-bottom))]" />
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
    </div>
  );
}
