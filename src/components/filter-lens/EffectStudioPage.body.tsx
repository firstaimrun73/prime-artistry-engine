/**
 * Motio2edit Filters editor — production UI.
 * Uses filter-editor-core for Adjust pipeline + output-only watermark.
 * Header locked. No implementation disclosure. No filter credits.
 * Recovered from debea276. Local filter engine only — Workers AI not used for ordinary Apply.
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
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-border" />
      <div className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[#FF5A1F]" style={{ width: `${pct}%` }} />
      <input type="range" min={min} max={max} step={1} value={value} aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#FF5A1F] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#FF5A1F] [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
      />
    </div>
  );
}

/** Fit full image into square canvas (letterbox) so filter thumbs never crop content. */
async function rgbaToSquareThumbUrl(image: RGBAImage, size = 160): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rgbaImageToObjectUrl(image);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / image.width, size / image.height);
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const ox = ((size - w) / 2) | 0;
  const oy = ((size - h) / 2) | 0;
  const tmp = document.createElement("canvas");
  tmp.width = image.width;
  tmp.height = image.height;
  const tctx = tmp.getContext("2d");
  if (!tctx) return rgbaImageToObjectUrl(image);
  const id = tctx.createImageData(image.width, image.height);
  id.data.set(image.data);
  tctx.putImageData(id, 0, 0);
  ctx.drawImage(tmp, 0, 0, image.width, image.height, ox, oy, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error("thumb encode failed"))), "image/jpeg", 0.88);
  });
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
  const [applying, setApplying] = useState(false);
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
  void thumbsBusy;
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
          if (!isUnlocked(item)) return;
          const def = getFilterById(item.id); if (!def) return;
          try {
            const out = applyProcessingProfile(base, def.processingProfile, { intensity: 85, mode: "preview", previewMaxDimension: 160, seed: 42 });
            if (out.cancelled) return;
            next[item.id] = await rgbaToSquareThumbUrl(out.image, 160);
          } catch (e) { console.warn("[Motio2edit] thumb failed", item.id, e); }
        }));
        if (cancelled || gen !== thumbGen.current) { for (const u of Object.values(next)) revokeUrl(u); return; }
        setThumbMap((prev) => ({ ...prev, ...next }));
      }
      if (gen === thumbGen.current) setThumbsBusy(false);
    };
    void run(); return () => { cancelled = true; };
  }, [file, items, kind, isUnlocked]);
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
    if (applying) return;
    setApplying(true);
    setBusy(true);
    try {
      const def = getFilterById(selected.id); if (!def) throw new Error("Filter not found");
      // Local deterministic engine only — no Workers AI on ordinary Premium/AI+ Apply.
      // Preview and final use the same recipe path (renderFullResolution / applyProcessingProfile).
      let out = renderFullResolution(sourceRgba.current, def.processingProfile, { intensity, mode: "full", seed: 42 });
      if (out.cancelled) throw new Error("Cancelled");
      let resultImage: RGBAImage = out.image;
      if (hasAdj(adj, highlightColorId, shadowColorId)) {
        resultImage = applyUserAdjustments(resultImage, adj, highlightTint, shadowTint);
      }
      const url = await rgbaImageToObjectUrl(resultImage);
      setResultUrl((prev) => { revokeUrl(prev); return url; });
      try {
        const wm = await applyOutputWatermark(url);
        setResultWmUrl((prev) => { revokeUrl(prev); return wm; });
      } catch { setResultWmUrl(url); }
      if (freeUser) setWmEnabled(true);
      setPhase("result"); setComparing(false);
      toast.success("Filter applied");
    } catch (err) {
      console.error("[Motio2edit] apply failed", err);
      toast.error("Could not apply filter");
    } finally {
      setApplying(false);
      setBusy(false);
    }
  };
  const onRestart = () => {
    setPhase("edit");
    setResultUrl((prev) => { revokeUrl(prev); return null; });
    setResultWmUrl((prev) => { revokeUrl(prev); return null; });
    setComparing(false);
  };
  const onDownload = () => {
    const url = (wmEnabled ? resultWmUrl : resultUrl) || resultUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `motio2edit-${selected?.name || "filter"}-${Date.now()}.jpg`;
    a.click();
    toast.success("Downloaded");
  };
  const onShare = async () => {
    const url = (wmEnabled ? resultWmUrl : resultUrl) || resultUrl;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const shareFile = new File([blob], `motio2edit-${selected?.name || "filter"}.jpg`, { type: blob.type || "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: "Motio2edit" });
      } else { onDownload(); toast.message("Saved — share from your gallery"); }
    } catch { onDownload(); }
  };
  const resetAdjust = () => {
    setAdj({ ...DEFAULT_ADJ });
    setHighlightColorId("neutral");
    setShadowColorId("neutral");
    setColorTarget("highlight");
    pushHistory({ selectedId, intensity, adj: { ...DEFAULT_ADJ }, highlightColorId: "neutral", shadowColorId: "neutral" });
  };
  const displayResultUrl = (wmEnabled ? resultWmUrl : resultUrl) || resultUrl;

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/80 bg-card/90 px-3 py-2.5 backdrop-blur-md">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <FiltersTitle className="text-lg font-bold tracking-tight" />
          <p className="truncate text-[11px] text-muted-foreground">Motio2edit</p>
        </div>
        {file ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
            <ImagePlus className="h-3.5 w-3.5" /> Change
          </button>
        ) : null}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950">
        {!file ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border/60 bg-card/40 px-10 py-12">
              <ImagePlus className="h-10 w-10 text-[#FF5A1F]" />
              <span className="text-sm font-semibold">Upload a photo</span>
              <span className="text-xs text-muted-foreground">JPG, PNG or WebP</span>
            </button>
          </div>
        ) : phase === "result" && sourceUrl && displayResultUrl ? (
          comparing ? (
            <CompareSlider before={sourceUrl} after={displayResultUrl} className="h-full max-h-full w-full max-w-full" />
          ) : (
            <img src={displayResultUrl} alt="Result" className="h-full w-full object-contain" />
          )
        ) : previewUrl || sourceUrl ? (
          <img src={previewUrl || sourceUrl || ""} alt="Preview" className="h-full w-full object-contain" />
        ) : null}
        {(busy || applying) && (
          <div className="absolute inset-0 grid place-items-center bg-black/35">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          </div>
        )}
      </div>

      {phase === "result" ? (
        <div className="shrink-0 border-t border-border bg-card px-3 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-around gap-1">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <ImagePlus className="h-5 w-5" /> Change
            </button>
            <button type="button" onClick={() => setComparing((c) => !c)} className={cn("flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium", comparing ? "text-[#FF5A1F]" : "text-muted-foreground")}>
              <Columns2 className="h-5 w-5" /> Compare
            </button>
            <button type="button" onClick={onDownload} className="flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <Download className="h-5 w-5" /> Download
            </button>
            <button type="button" onClick={() => void onShare()} className="flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <Share2 className="h-5 w-5" /> Share
            </button>
            <button type="button" onClick={() => !freeUser && setWmEnabled((w) => !w)} className={cn("flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium", wmEnabled ? "text-[#FF5A1F]" : "text-muted-foreground", freeUser && "opacity-60")}>
              <span className="text-sm font-bold">W</span> Watermark
            </button>
          </div>
          <button type="button" onClick={onRestart} className="mx-auto mt-2 block w-full max-w-lg rounded-full border border-border bg-background py-2.5 text-sm font-semibold">
            Edit again
          </button>
        </div>
      ) : file ? (
        <>
          <div className="shrink-0 border-t border-border bg-card">
            <div className="flex items-center gap-1 px-2 pt-2">
              <button type="button" onClick={() => setEditorTab("filter")} className={cn("flex-1 rounded-full py-1.5 text-xs font-semibold", editorTab === "filter" ? "bg-[#FF5A1F] text-white" : "text-muted-foreground")}>
                Filters
              </button>
              <button type="button" onClick={() => setEditorTab("adjust")} className={cn("flex-1 rounded-full py-1.5 text-xs font-semibold", editorTab === "adjust" ? "bg-[#FF5A1F] text-white" : "text-muted-foreground")}>
                Adjust
              </button>
            </div>

            {editorTab === "filter" ? (
              <div className="px-2 pb-2 pt-1">
                <div className="mb-1.5 flex gap-1.5 overflow-x-auto scrollbar-none">
                  <button type="button" onClick={() => setCategory("all")} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === "all" ? "bg-[#FF5A1F] text-white" : "border border-border bg-card")}>
                    All
                  </button>
                  {sortedCategories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === c ? "bg-[#FF5A1F] text-white" : "border border-border bg-card")}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2.5 overflow-x-auto px-1 pb-1 pt-0.5 scrollbar-none">
                  {filtered.map((item) => {
                    const thumb = thumbMap[item.id];
                    const isSel = selectedId === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => selectFilter(item)} className="w-[78px] shrink-0 text-left">
                        <div className={cn("relative aspect-[1/1.05] overflow-hidden rounded-lg bg-muted", isSel && "outline outline-2 outline-offset-1 outline-[#FF5A1F]")}>
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted" />}
                          {isSel && <span className="absolute right-1 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#FF5A1F] text-[11px] font-bold text-white">✓</span>}
                          {!item.isFree && item.badge && (
                            item.badge === "ai+" ? (
                              <span className="absolute left-1 top-1 inline-flex items-center rounded bg-[#FF5A1F]/95 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white ring-1 ring-[#FF5A1F]/50">AI+</span>
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
                <div className="mt-2 flex items-center gap-2 px-1">
                  <span className="w-16 shrink-0 text-[11px] text-muted-foreground">Intensity</span>
                  <OrangeSlider value={intensity} min={0} max={100} onChange={(v) => { setIntensity(v); pushHistoryDebounced({ selectedId, intensity: v, adj: { ...adj }, highlightColorId, shadowColorId }); }} ariaLabel="Filter intensity" />
                  <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{intensity}</span>
                </div>
                <button
                  type="button"
                  disabled={!selected || applying || busy}
                  onClick={() => void onApply()}
                  className={cn(
                    "mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
                    selected && !applying
                      ? "bg-gradient-to-r from-[#FF5A1F] to-orange-500 text-white shadow-md shadow-[#FF5A1F]/25"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  {applying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            ) : (
              <div className="px-3 pb-3 pt-2">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(Object.keys(ADJUST_META) as AdjustKey[]).map((k) => (
                    <button key={k} type="button" onClick={() => setAdjKey(k)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", adjKey === k ? "bg-[#FF5A1F] text-white" : "border border-border bg-card text-muted-foreground")}>
                      {ADJUST_META[k].label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{ADJUST_META[adjKey].label}</span>
                  <OrangeSlider
                    value={adj[adjKey]}
                    min={ADJUST_META[adjKey].min}
                    max={ADJUST_META[adjKey].max}
                    onChange={(v) => {
                      const next = { ...adj, [adjKey]: v };
                      setAdj(next);
                      pushHistoryDebounced({ selectedId, intensity, adj: next, highlightColorId, shadowColorId });
                    }}
                    ariaLabel={ADJUST_META[adjKey].label}
                  />
                  <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{adj[adjKey]}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button type="button" onClick={resetAdjust} className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:underline">
                    Reset adjust
                  </button>
                  <div className="flex gap-2">
                    <button type="button" disabled={!canUndo} onClick={onUndo} className={cn("grid h-9 w-9 place-items-center rounded-full border border-border", !canUndo && "opacity-40")}>
                      <Undo2 className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canRedo} onClick={onRedo} className={cn("grid h-9 w-9 place-items-center rounded-full border border-border", !canRedo && "opacity-40")}>
                      <Redo2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
