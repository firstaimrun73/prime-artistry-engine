/**
 * Motio2edit Filters editor — production UI.
 * Uses filter-editor-core for Adjust pipeline + output-only watermark.
 * Header locked. No implementation disclosure. No filter credits.
 * Full UI: output icon bar + Watermark + bottom Undo/Redo. AI+ on Apply only.
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
  rgbaImageToBlob,
  downscale,
} from "@/lib/filter-lens/client/image-bridge";
import {
  applyProcessingProfile,
  renderFullResolution,
} from "@/lib/filter-lens/filters/filter-engine";
import { getFilterById } from "@/lib/filter-lens/filters/filter-registry";
import { isAiPlusStyle } from "@/lib/filter-lens/filters/ai-plus-styles";
import { applyAiPlusFilter } from "@/lib/filter-lens/filters/ai-plus-filter.functions";
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
      const style = def.processingProfile?.style;
      let resultImage: RGBAImage | null = null;
      if (style && isAiPlusStyle(style)) {
        try {
          const forAi = downscale(sourceRgba.current, 1024);
          const blob = await rgbaImageToBlob(forAi, "image/jpeg");
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          const imageBase64 = btoa(binary);
          const aiResult = await applyAiPlusFilter({
            data: { style, intensity, imageBase64, mimeType: "image/jpeg", width: forAi.width, height: forAi.height },
          });
          if (aiResult?.ok && aiResult.imageBase64) {
            const bin = atob(aiResult.imageBase64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            const aiBlob = new Blob([arr], { type: aiResult.mimeType || "image/png" });
            const aiFile = new File([aiBlob], "ai-result.png", { type: aiBlob.type });
            resultImage = await fileToRGBAImage(aiFile);
          }
        } catch (aiErr) {
          console.error("[Motio2edit] AI+ apply -> local fallback", aiErr instanceof Error ? aiErr.message : aiErr);
        }
      }
      if (!resultImage) {
        let out = renderFullResolution(sourceRgba.current, def.processingProfile, { intensity, mode: "full", seed: 42 });
        if (out.cancelled) throw new Error("Cancelled");
        resultImage = out.image;
      }
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
      setPhase("result"); setComparing(false); toast.success("Filter applied");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Apply failed"); }
    finally { setBusy(false); setApplying(false); }
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
      <div className="flex min-h-[60vh] flex-col bg-background text-foreground">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          <p className="text-sm text-muted-foreground">Loading filters…</p>
        </div>
      </div>
    );
  }

  if (!hasPhoto) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
        <header className="flex items-center gap-3 border-b border-border px-3 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-foreground uppercase">Motio<span className="text-[#FF5A1F]">2</span>edit</p>
            <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-10 min-h-0">
          <p className="mb-5 max-w-sm text-center text-sm text-muted-foreground">AI-powered filters · live preview on your photo</p>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex w-full flex-col items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/45 bg-[#FFF1E6] px-6 py-16 transition hover:border-[#FF5A1F] hover:bg-[#FFE6DA] dark:bg-card dark:hover:bg-muted">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/15 text-[#FF5A1F]">{busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}</span>
            <span className="text-base font-bold">Upload a photo</span>
            <span className="text-xs text-muted-foreground">JPG · PNG · WebP</span>
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2.5">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">Motio<span className="text-[#FF5A1F]">2</span>edit</p>
          <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
        </div>
        {phase !== "result" ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold">
            <ImagePlus className="h-3.5 w-3.5" /> Change
          </button>
        ) : null}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-zinc-100 dark:bg-zinc-900 px-2 py-2">
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
          <div className="absolute inset-0 grid place-items-center bg-black/35">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          </div>
        )}
      </div>

      {phase === "result" ? (
        <div className="shrink-0 border-t border-border bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-center gap-3">
            <button type="button" onClick={() => inputRef.current?.click()} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Change image">
              <ImagePlus className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setComparing((v) => !v)} className={cn("grid h-11 w-11 place-items-center rounded-xl", comparing && "bg-[#FF5A1F]/15 text-[#FF5A1F]")} aria-label="Compare"><Columns2 className="h-5 w-5" /></button>
            <button type="button" onClick={onDownload} className="grid h-11 w-11 place-items-center rounded-xl" aria-label="Download"><Download className="h-5 w-5" /></button>
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
                freeUser ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-90" : showWm ? "border-[#FF5A1F]/40 bg-[#FF5A1F]/15 text-[#FF5A1F]" : "border-border bg-card text-foreground",
              )}
              aria-label={freeUser ? "Watermark locked on free plan" : "Toggle watermark"}
            >
              Watermark
              {freeUser ? <span className="text-[10px] font-medium opacity-80">Locked</span> : null}
            </button>
          </div>
          {freeUser ? <p className="text-center text-[10px] text-muted-foreground">Free plan includes Motio2edit watermark</p> : null}
          <button type="button" onClick={onRestart} className="mt-2 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-3 text-sm font-semibold">
            Edit again
          </button>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-center gap-10 border-t border-border/80 bg-card/90 px-4 py-1.5 backdrop-blur-sm">
            <button type="button" onClick={onUndo} disabled={!canUndo} className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
            <button type="button" onClick={onRedo} disabled={!canRedo} className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
          </div>
          <div className="shrink-0 border-t border-border/60 bg-card/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
            <div className="mb-2 flex gap-6 px-4">
              <button type="button" onClick={() => setEditorTab("filter")} className={cn("relative pb-2 text-[15px] font-semibold uppercase tracking-wide", editorTab === "filter" ? "text-[#FF5A1F]" : "text-muted-foreground")}>
                Filters{editorTab === "filter" && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded bg-[#FF5A1F]" />}
              </button>
              <button type="button" onClick={() => setEditorTab("adjust")} className={cn("relative pb-2 text-[15px] font-semibold uppercase tracking-wide", editorTab === "adjust" ? "text-[#FF5A1F]" : "text-muted-foreground")}>
                Adjust{editorTab === "adjust" && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded bg-[#FF5A1F]" />}
              </button>
            </div>
            {editorTab === "filter" ? (
              <div className="space-y-3 px-3 pb-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button type="button" onClick={() => setCategory("all")} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === "all" ? "bg-[#FF5A1F] text-white" : "border border-border bg-card")}>All</button>
                  {sortedCategories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} className={cn("h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium", category === c ? "bg-[#FF5A1F] text-white" : "border border-border bg-card")}>{c}</button>
                  ))}
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {filtered.map((item) => {
                    const thumb = thumbMap[item.id];
                    const locked = !isUnlocked(item);
                    const isSel = selectedId === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => selectFilter(item)} className="w-[78px] shrink-0 text-left">
                        <div className={cn("relative aspect-[1/1.05] overflow-hidden rounded-lg bg-muted", isSel && "outline outline-2 outline-offset-1 outline-[#FF5A1F]")}>
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} /> : <div className="h-full w-full bg-muted" />}
                          {isSel && <span className="absolute right-1 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#FF5A1F] text-[11px] font-bold text-white">✓</span>}
                          {!item.isFree && item.badge && (
                            item.badge === "ai+" ? (
                              <span className="absolute left-1 top-1 rounded bg-[#FF5A1F] px-1 py-0.5 text-[8px] font-bold text-white">AI+</span>
                            ) : (
                              <span className="absolute left-1 top-1 rounded bg-foreground/80 px-1 py-0.5 text-[8px] font-bold text-background">{item.badge}</span>
                            )
                          )}
                          {locked && <span className="absolute bottom-1 right-1 text-[11px]">🔒</span>}
                        </div>
                        <span className="mt-1 block max-w-[78px] truncate text-center text-[11px] font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 px-1">
                  <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">Intensity</span>
                  <OrangeSlider value={intensity} min={0} max={100} onChange={(v) => { bumpToEdit(); setIntensity(v); pushHistoryDebounced({ selectedId, intensity: v, adj: { ...adj }, highlightColorId, shadowColorId }); }} ariaLabel="Intensity" />
                  <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums">{intensity}</span>
                </div>
                <button type="button" disabled={applying || busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40">
                  {applying || busy ? (<><Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden /> Applying…</>) : ("Apply filter")}
                </button>
              </div>
            ) : (
              <div className="space-y-3 px-3 pb-3">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {ADJUST_META.map((m) => (
                    <button key={m.key} type="button" onClick={() => setAdjKey(m.key)} className={cn("flex min-w-[64px] shrink-0 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide", adjKey === m.key ? "text-[#FF5A1F]" : "text-muted-foreground")}>
                      <m.icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 px-1">
                  <OrangeSlider value={adj[adjKey]} min={adjMeta.min} max={adjMeta.max} onChange={(v) => { bumpToEdit(); const next = { ...adj, [adjKey]: v }; setAdj(next); pushHistoryDebounced({ selectedId, intensity, adj: next, highlightColorId, shadowColorId }); }} ariaLabel={adjMeta.label} />
                  <span className="w-10 text-right text-xs font-bold tabular-nums">{adj[adjKey]}</span>
                </div>
                {(adjKey === "color" || adjKey === "hue") && (
                  <div className="px-1">
                    <div className="mb-2 flex gap-2">
                      <button type="button" onClick={() => setColorTarget("highlight")} className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", colorTarget === "highlight" ? "bg-[#FF5A1F] text-white" : "border border-border")}>Highlight</button>
                      <button type="button" onClick={() => setColorTarget("shadow")} className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", colorTarget === "shadow" ? "bg-[#FF5A1F] text-white" : "border border-border")}>Shadow</button>
                    </div>
                    <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Tint</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_SWATCHES.map((s) => {
                        const activeId = colorTarget === "highlight" ? highlightColorId : shadowColorId;
                        return (
                          <button key={s.id} type="button" onClick={() => {
                            bumpToEdit();
                            if (colorTarget === "highlight") { setHighlightColorId(s.id); pushHistory({ selectedId, intensity, adj: { ...adj }, highlightColorId: s.id, shadowColorId }); }
                            else { setShadowColorId(s.id); pushHistory({ selectedId, intensity, adj: { ...adj }, highlightColorId, shadowColorId: s.id }); }
                          }} className={cn("h-7 w-7 rounded-full border-2", activeId === s.id ? "border-white shadow-[0_0_0_2px_#FF5A1F] scale-110" : "border-transparent")} style={{ background: `rgb(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]})` }} aria-label={s.id} />
                        );
                      })}
                    </div>
                  </div>
                )}
                <button type="button" onClick={resetAdjust} className="text-center text-xs text-muted-foreground underline">Reset adjustments</button>
                <button type="button" disabled={applying || busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white disabled:opacity-40">
                  {applying || busy ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Applying…</>) : ("Apply filter")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
