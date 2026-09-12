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
  Check,
  Columns2,
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Share2,
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
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-[#E8E0D8]" />
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
  // Free = no paid plan and not admin. Admin treated as fully unlocked for testing.
  const freeUser = !isAdmin && (!profile || profile.plan === "free" || !profile.plan);
  const [category, setCategory] = useState<string | "all">("all");
  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");
  const [colorId, setColorId] = useState("neutral");
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
  const isUnlocked = useCallback((item: CatalogItem) => isAdmin || item.isFree === true, [isAdmin]);
  const filtered = useMemo(() => (category === "all" ? items : items.filter((i) => i.category === category)), [items, category]);
  const colorTint = useMemo(() => {
    const sw = COLOR_SWATCHES.find((s) => s.id === colorId);
    if (!sw || sw.id === "neutral") return null;
    return sw.rgb;
  }, [colorId]);
  const revokeUrl = (url: string | null | undefined) => { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); };
  const clearThumbs = () => { setThumbMap((prev) => { for (const u of Object.values(prev)) revokeUrl(u); return {}; }); };
  const bumpToEdit = () => {
    if (phase === "result") {
      setPhase("edit");
      setResultUrl((prev) => { revokeUrl(prev); return null; });
      setResultWmUrl((prev) => { revokeUrl(prev); return null; });
      setComparing(false);
    }
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
      setPhase("edit"); setEditorTab("filter"); setAdj({ ...DEFAULT_ADJ }); setColorId("neutral"); setComparing(false);
      if (!selectedId && items[0]) { setSelectedId(items[0].id); setIntensity(items[0].intensityDefault); }
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
            const out = applyProcessingProfile(base, def.processingProfile, { intensity: item.intensityDefault, mode: "preview", previewMaxDimension: 160, seed: 42 });
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
        if (hasAdj(adj, colorId)) out = { ...out, image: applyUserAdjustments(out.image, adj, colorTint) };
        const url = await rgbaImageToObjectUrl(out.image);
        if (gen !== previewGen.current) { revokeUrl(url); return; }
        setPreviewUrl((prev) => { revokeUrl(prev); return url; });
      } catch (err) { console.error("[Motio2edit] preview failed", err); }
      finally { if (gen === previewGen.current) setBusy(false); }
    };
    const t = window.setTimeout(() => void run(), 60);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [file, selected, intensity, kind, phase, isUnlocked, adj, colorId, colorTint]);
  const selectFilter = (item: CatalogItem) => {
    if (selectLock.current) return;
    selectLock.current = true;
    window.setTimeout(() => { selectLock.current = false; }, 280);
    if (!isUnlocked(item)) {
      toast.message(item.badge === "ai+" ? "AI+ filter — upgrade to unlock" : "Premium filter — upgrade to unlock");
      return;
    }
    bumpToEdit(); setSelectedId(item.id); setIntensity(item.intensityDefault); setEditorTab("filter");
  };
  const onApply = async () => {
    if (!file || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) { toast.message("Unlock this filter to apply"); return; }
    setBusy(true);
    try {
      const def = getFilterById(selected.id); if (!def) throw new Error("Filter not found");
      let out = renderFullResolution(sourceRgba.current, def.processingProfile, { intensity, mode: "full", seed: 42 });
      if (out.cancelled) throw new Error("Cancelled");
      if (hasAdj(adj, colorId)) out = { ...out, image: applyUserAdjustments(out.image, adj, colorTint) };
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
      const file = new File([blob], `motio2edit-${selected?.name ?? "filter"}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Motio2edit Filters" });
      } else { onDownload(); toast.message("Saved — share from your gallery"); }
    } catch { onDownload(); }
  };
  const resetAdjust = () => { setAdj({ ...DEFAULT_ADJ }); setColorId("neutral"); };
  const processedUrl = resultUrl || previewUrl;
  const showWm = freeUser || wmEnabled;
  const displayResultUrl = showWm ? (resultWmUrl || resultUrl) : (resultUrl || resultWmUrl);
  const hasPhoto = !!sourceUrl;
  const adjMeta = ADJUST_META.find((m) => m.key === adjKey)!;

  if (!hasPhoto) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#FFFBF7] text-[#161412]">
        <header className="flex items-center gap-3 border-b border-[#E8E0D8] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] bg-white" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">Motio2edit</p>
            <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-10 min-h-0">
          <p className="mb-5 max-w-sm text-center text-sm text-[#6F6862]">AI-powered filters · live preview on your photo</p>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex w-full flex-col items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/45 bg-[#FFF1E6] px-6 py-16 transition hover:border-[#FF5A1F] hover:bg-[#FFE6DA]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/15 text-[#FF5A1F]">{busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}</span>
            <span className="text-base font-semibold">Drop image or tap to upload</span>
            <span className="max-w-xs text-center text-sm text-[#6F6862]">Looks unlock after you upload</span>
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#FFFBF7] text-[#161412]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E8E0D8] bg-white px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8]" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">Motio2edit</p>
          <FiltersTitle className="truncate text-base font-bold" />
        </div>
        {phase !== "result" ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 text-xs font-semibold">
            <ImagePlus className="h-3.5 w-3.5" /> Photo
          </button>
        ) : null}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
      </header>

      <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2">
        {phase === "result" && sourceUrl && displayResultUrl ? (
          comparing ? (
            <CompareSlider before={sourceUrl} after={displayResultUrl} className="max-h-full w-full max-w-full" />
          ) : (
            <img src={displayResultUrl} alt="Result" className="max-h-full w-auto max-w-full rounded-xl object-contain" draggable={false} />
          )
        ) : (
          <img src={processedUrl || sourceUrl!} alt="Preview" className="max-h-full w-auto max-w-full rounded-xl object-contain" draggable={false} />
        )}
        {busy && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#FFFBF7]/40">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          </div>
        )}
      </section>

      {phase === "result" ? (
        <div className="shrink-0 border-t border-[#E8E0D8] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-center gap-5">
            <button type="button" onClick={onRestart} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button type="button" onClick={() => setComparing((v) => !v)} className={cn("grid h-11 w-11 place-items-center rounded-xl", comparing && "bg-[#FFE6DA] text-[#FF5A1F]")} aria-label="Compare"><Columns2 className="h-5 w-5" /></button>
            <button type="button" onClick={onDownload} className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFE8DA]" aria-label="Download"><Download className="h-5 w-5" /></button>
          </div>
          <div className="mb-3 flex flex-col items-center gap-1">
            <button
              type="button"
              disabled={freeUser}
              onClick={() => {
                if (freeUser) {
                  toast.message("Free plan watermark cannot be removed");
                  return;
                }
                setWmEnabled((v) => !v);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                freeUser
                  ? "cursor-not-allowed border-[#E8E0D8] bg-[#F5F0EB] text-[#6F6862] opacity-90"
                  : showWm
                    ? "border-[#FF5A1F]/40 bg-[#FFE8DA] text-[#FF5A1F]"
                    : "border-[#E8E0D8] bg-white text-[#161412]",
              )}
              aria-pressed={showWm}
              aria-label={freeUser ? "Watermark locked on free plan" : "Toggle watermark"}
            >
              <span
                className={cn(
                  "relative inline-flex h-4 w-7 items-center rounded-full transition",
                  showWm ? "bg-[#FF5A1F]" : "bg-[#D4CDC4]",
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    "absolute h-3 w-3 rounded-full bg-white shadow transition",
                    showWm ? "right-0.5" : "left-0.5",
                  )}
                />
              </span>
              Watermark
              {freeUser ? <span className="text-[10px] font-medium opacity-80">Locked</span> : null}
            </button>
            {freeUser ? (
              <p className="text-center text-[10px] text-[#6F6862]">Free plan includes Motio2edit watermark</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onDownload} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white"><Download className="h-4 w-4" /> Download</button>
            <button type="button" onClick={() => void onShare()} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E8E0D8] bg-white py-3 text-sm font-bold text-[#161412]"><Share2 className="h-4 w-4" /> Share</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-center gap-8 border-t border-[#E8E0D8]/80 bg-white/90 px-4 pt-2 backdrop-blur-sm">
            <button type="button" onClick={onRestart} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button type="button" onPointerDown={() => setComparing(true)} onPointerUp={() => setComparing(false)} onPointerLeave={() => setComparing(false)} className={cn("grid h-11 w-11 place-items-center rounded-xl", comparing && "bg-[#FFE6DA] text-[#FF5A1F]")} aria-label="Compare"><Columns2 className="h-5 w-5" /></button>
            <button type="button" onClick={onDownload} className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFE8DA]" aria-label="Download"><Download className="h-5 w-5" /></button>
          </div>
          <div className="shrink-0 border-t border-[#E8E0D8]/60 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
            <div className="mb-2 flex items-center gap-6 px-4">
              <button type="button" onClick={() => setEditorTab("filter")} className={cn("relative pb-2 text-[15px] font-semibold uppercase tracking-wide", editorTab === "filter" ? "text-[#FF5A1F]" : "text-[#6F6862]")}>
                Filter{editorTab === "filter" && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded bg-[#FF5A1F]" />}
              </button>
              <button type="button" onClick={() => setEditorTab("adjust")} className={cn("relative pb-2 text-[15px] font-semibold uppercase tracking-wide", editorTab === "adjust" ? "text-[#FF5A1F]" : "text-[#6F6862]")}>
                Adjust{editorTab === "adjust" && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded bg-[#FF5A1F]" />}
              </button>
              <button type="button" onClick={() => void onApply()} className="ml-auto grid h-10 w-10 place-items-center text-[#FF5A1F]" aria-label="Apply"><Check className="h-6 w-6" strokeWidth={3} /></button>
            </div>
            {editorTab === "filter" ? (
              <div className="space-y-3 px-3">
                <div className="flex gap-2 overflow-x-auto px-1 scrollbar-none">
                  <button type="button" onClick={() => setCategory("all")} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === "all" ? "bg-[#FF5A1F] text-white" : "border border-[#E8E0D8] bg-white")}>All</button>
                  {sortedCategories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === c ? "bg-[#FF5A1F] text-white" : "border border-[#E8E0D8] bg-white")}>{c}</button>
                  ))}
                </div>
                <p className="px-1 text-xs text-[#6F6862]">AI filters · live preview of this photo</p>
                <div className="flex gap-2.5 overflow-x-auto px-1 pb-1 scrollbar-none">
                  {filtered.map((item) => {
                    const thumb = thumbMap[item.id];
                    const isSel = selectedId === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => selectFilter(item)} className="w-[78px] shrink-0 text-left">
                        <div className={cn("relative aspect-[1/1.05] overflow-hidden rounded-lg bg-[#141210]", isSel && "outline outline-2 outline-offset-1 outline-[#FF5A1F]")}>
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#E8E0D8]" />}
                          {isSel && <span className="absolute right-1 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#FF5A1F] text-[11px] font-bold text-white">✓</span>}
                          {!item.isFree && item.badge && (
                            item.badge === "ai+" ? (
                              <span className="absolute left-1 top-1 inline-flex items-center rounded bg-[#1B3A6B]/90 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#7EC8FF] ring-1 ring-[#7EC8FF]/40">AI+</span>
                            ) : (
                              <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-[#8B6914] to-[#C9A227] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#FFF8E7] shadow-sm">
                                <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                  <path d="M8 1.5l1.6 3.6 3.9.3-3 2.7.9 3.8L8 9.8l-3.4 2.1.9-3.8-3-2.7 3.9-.3L8 1.5z" />
                                </svg>
                                Premium
                              </span>
                            )
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white truncate">{item.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 px-1">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-[#6F6862]">Intensity</span>
                  <OrangeSlider value={intensity} min={0} max={100} onChange={(v) => { bumpToEdit(); setIntensity(v); }} ariaLabel="Intensity" />
                  <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-[#161412]">{intensity}</span>
                </div>
                <button type="button" disabled={busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40">
                  {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>) : ("Apply filter")}
                </button>
              </div>
            ) : (
              <div className="space-y-3 px-3">
                <div className="px-1">
                  <OrangeSlider value={adj[adjKey]} min={adjMeta.min} max={adjMeta.max} onChange={(v) => { bumpToEdit(); setAdj((a) => ({ ...a, [adjKey]: v })); }} ariaLabel={adjMeta.label} />
                </div>
                <div className="flex gap-1 overflow-x-auto px-1 scrollbar-none">
                  {ADJUST_META.map((m) => (
                    <button key={m.key} type="button" onClick={() => setAdjKey(m.key)} className={cn("flex min-w-[64px] shrink-0 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide", adjKey === m.key ? "text-[#FF5A1F]" : "text-[#6F6862]")}>
                      <m.icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="leading-tight">{m.label}</span>
                      <span className={cn("h-1 w-1 rounded-full", adjKey === m.key || adj[m.key] !== 0 ? "bg-[#FF5A1F]" : "bg-transparent")} />
                    </button>
                  ))}
                </div>
                {adjKey === "color" && (
                  <div className="mx-1 rounded-2xl border border-[#FF5A1F]/15 bg-gradient-to-b from-[#FFF5EE] to-[#FFEEE4] p-3">
                    <div className="mb-3 flex justify-center gap-6">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#FF5A1F]">Highlight</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#6F6862]">Shadow</span>
                    </div>
                    <div className="mb-3 flex flex-wrap justify-center gap-2.5">
                      {COLOR_SWATCHES.map((s) => (
                        <button key={s.id} type="button" onClick={() => { bumpToEdit(); setColorId(s.id); }} className={cn("h-7 w-7 rounded-full border-2", colorId === s.id ? "border-white shadow-[0_0_0_2px_#FF5A1F] scale-110" : "border-transparent")} style={{ background: `rgb(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]})` }} aria-label={s.id} />
                      ))}
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
