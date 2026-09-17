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
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={ariaLabel}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[#FF5A1F]"
      style={{
        background: `linear-gradient(to right, #FF5A1F 0%, #FF5A1F ${pct}%, hsl(var(--muted)) ${pct}%, hsl(var(--muted)) 100%)`,
      }}
    />
  );
}

export function EffectStudioPage({
  kind,
  title,
  items,
  categories,
  initialSelectedId = null,
}: Props) {
  const { profile, user } = useAuth();
  const isAdmin = isAdminEmail(user?.email ?? profile?.email);
  const freeUser = !isAdmin && (!profile || profile.plan === "free" || !profile.plan);
  const planId = (profile as { plan?: string } | null)?.plan ?? "free";
  const canUseAiPlus = isAdmin || ["lite", "plus", "pro", "studio", "business"].includes(planId);
  const canUsePremium = isAdmin || ["pro", "studio", "business"].includes(planId);

  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");
  const [highlightColorId, setHighlightColorId] = useState("neutral");
  const [shadowColorId, setShadowColorId] = useState("neutral");
  const [colorTarget, setColorTarget] = useState<"highlight" | "shadow">("highlight");

  const historyRef = useRef<{
    selectedId: string | null;
    intensity: number;
    adj: AdjustValues;
    highlightColorId: string;
    shadowColorId: string;
  }[]>([]);
  const historyIdxRef = useRef(-1);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultWmUrl, setResultWmUrl] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(85);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [phase, setPhase] = useState<"idle" | "edit" | "result">("idle");
  const [comparing, setComparing] = useState(false);
  const [wmEnabled, setWmEnabled] = useState(true);
  const [category, setCategory] = useState<string | "all">("all");
  const sourceRgba = useRef<RGBAImage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);
  const isUnlocked = useCallback((item: CatalogItem) => {
    if (isAdmin || item.isFree === true) return true;
    if (item.badge === "ai+") return canUseAiPlus;
    if (item.badge === "premium" || item.badge === "pro") return canUsePremium;
    return canUsePremium;
  }, [isAdmin, canUseAiPlus, canUsePremium]);

  const filtered = useMemo(
    () => (category === "all" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );

  const highlightTint = useMemo(() => COLOR_SWATCHES.find((s) => s.id === highlightColorId)?.rgb ?? [128, 128, 128], [highlightColorId]);
  const shadowTint = useMemo(() => COLOR_SWATCHES.find((s) => s.id === shadowColorId)?.rgb ?? [128, 128, 128], [shadowColorId]);

  const revokeUrl = (url: string | null | undefined) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const pushHistory = useCallback((snap: {
    selectedId: string | null;
    intensity: number;
    adj: AdjustValues;
    highlightColorId: string;
    shadowColorId: string;
  }) => {
    const last = historyRef.current[historyIdxRef.current];
    if (last && last.selectedId === snap.selectedId && last.intensity === snap.intensity && last.highlightColorId === snap.highlightColorId && last.shadowColorId === snap.shadowColorId && JSON.stringify(last.adj) === JSON.stringify(snap.adj)) return;
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 40) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  }, []);

  const pushHistoryDebounced = useCallback((snap: Parameters<typeof pushHistory>[0]) => {
    pushHistory(snap);
  }, [pushHistory]);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current >= 0 && historyIdxRef.current < historyRef.current.length - 1;

  const applySnap = (snap: (typeof historyRef.current)[0]) => {
    setSelectedId(snap.selectedId);
    setIntensity(snap.intensity);
    setAdj({ ...snap.adj });
    setHighlightColorId(snap.highlightColorId);
    setShadowColorId(snap.shadowColorId);
  };

  const onUndo = () => {
    if (!canUndo) return;
    historyIdxRef.current -= 1;
    applySnap(historyRef.current[historyIdxRef.current]);
  };

  const onRedo = () => {
    if (!canRedo) return;
    historyIdxRef.current += 1;
    applySnap(historyRef.current[historyIdxRef.current]);
  };

  const bumpToEdit = () => {
    if (phase === "result") {
      setPhase("edit");
      setResultUrl((p) => { revokeUrl(p); return null; });
      setResultWmUrl((p) => { revokeUrl(p); return null; });
    }
  };

  const onPick = async (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image (JPG, PNG, WebP)");
      return;
    }
    setBusy(true);
    try {
      revokeUrl(sourceUrl);
      revokeUrl(previewUrl);
      revokeUrl(resultUrl);
      revokeUrl(resultWmUrl);
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      const url = URL.createObjectURL(f);
      setFile(f);
      setSourceUrl(url);
      setPreviewUrl(null);
      setResultUrl(null);
      setResultWmUrl(null);
      setPhase("edit");
      setAdj({ ...DEFAULT_ADJ });
      setHighlightColorId("neutral");
      setShadowColorId("neutral");
      const initId = selectedId || items[0]?.id || null;
      const initIntensity = 85;
      if (!selectedId && items[0]) setSelectedId(items[0].id);
      historyRef.current = [{ selectedId: initId, intensity: initIntensity, adj: { ...DEFAULT_ADJ }, highlightColorId: "neutral", shadowColorId: "neutral" }];
      historyIdxRef.current = 0;
      toast.success("Photo ready — pick a look");
    } catch {
      toast.error("Could not read that photo");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!file || !selected || kind !== "filter" || phase === "result") return;
    if (!isUnlocked(selected) || !sourceRgba.current) return;
    const gen = ++previewGen.current;
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const def = getFilterById(selected.id);
        if (!def) return;
        const scaled = downscale(sourceRgba.current!, 720);
        let out = applyProcessingProfile(scaled, def.processingProfile, {
          intensity,
          mode: "preview",
          previewMaxDimension: 720,
          seed: 42,
        });
        if (hasAdj(adj, highlightColorId, shadowColorId)) {
          out = { ...out, image: applyUserAdjustments(out.image, adj, highlightTint, shadowTint) };
        }
        if (cancelled || gen !== previewGen.current || out.cancelled) return;
        const url = await rgbaImageToObjectUrl(out.image);
        if (gen !== previewGen.current) {
          revokeUrl(url);
          return;
        }
        setPreviewUrl((prev) => {
          revokeUrl(prev);
          return url;
        });
      } catch (err) {
        console.error("[Motio2edit] preview failed", err);
      } finally {
        if (gen === previewGen.current) setBusy(false);
      }
    };
    const t = window.setTimeout(() => void run(), 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [file, selected, intensity, kind, phase, isUnlocked, adj, highlightColorId, shadowColorId, highlightTint, shadowTint]);

  const selectFilter = (item: CatalogItem) => {
    if (!isUnlocked(item)) {
      toast.message(item.badge === "ai+" ? "AI+ filter — upgrade to unlock" : "Premium filter — upgrade to unlock");
      return;
    }
    bumpToEdit();
    setSelectedId(item.id);
    setIntensity(85);
    pushHistory({ selectedId: item.id, intensity: 85, adj: { ...adj }, highlightColorId, shadowColorId });
  };

  const onApply = async () => {
    if (!file || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) { toast.message("Unlock this filter to apply"); return; }
    if (applying) return;
    setApplying(true);
    setBusy(true);
    try {
      const def = getFilterById(selected.id);
      if (!def) throw new Error("Filter not found");
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
            data: {
              style,
              intensity,
              imageBase64,
              mimeType: "image/jpeg",
              width: forAi.width,
              height: forAi.height,
            },
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
        const out = renderFullResolution(sourceRgba.current, def.processingProfile, {
          intensity,
          mode: "full",
          seed: 42,
        });
        if (out.cancelled) throw new Error("Cancelled");
        resultImage = out.image;
      }

      if (hasAdj(adj, highlightColorId, shadowColorId)) {
        resultImage = applyUserAdjustments(resultImage, adj, highlightTint, shadowTint);
      }

      const url = await rgbaImageToObjectUrl(resultImage);
      setResultUrl((prev) => {
        revokeUrl(prev);
        return url;
      });
      try {
        const wm = await applyOutputWatermark(url);
        setResultWmUrl((prev) => {
          revokeUrl(prev);
          return wm;
        });
      } catch {
        setResultWmUrl(url);
      }
      if (freeUser) setWmEnabled(true);
      setPhase("result");
      setComparing(false);
      toast.success("Filter applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
      setApplying(false);
    }
  };

  const resetAdjust = () => {
    bumpToEdit();
    setAdj({ ...DEFAULT_ADJ });
    setHighlightColorId("neutral");
    setShadowColorId("neutral");
    pushHistory({ selectedId, intensity, adj: { ...DEFAULT_ADJ }, highlightColorId: "neutral", shadowColorId: "neutral" });
  };

  const onDownload = () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm ? resultWmUrl || resultUrl || previewUrl : resultUrl || resultWmUrl || previewUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `motio2edit-${selected?.name ?? "filter"}.jpg`;
    a.click();
  };

  const onShare = async () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm ? resultWmUrl || resultUrl || previewUrl : resultUrl || resultWmUrl || previewUrl;
    if (!url) return;
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const shareFile = new File([blob], `motio2edit-${selected?.name ?? "filter"}.jpg`, { type: "image/jpeg" });
      if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: "Motio2edit Filters" });
      } else {
        onDownload();
        toast.message("Saved — share from your gallery");
      }
    } catch {
      onDownload();
    }
  };

  const displayUrl =
    phase === "result"
      ? freeUser || wmEnabled
        ? resultWmUrl || resultUrl
        : resultUrl || resultWmUrl
      : previewUrl || sourceUrl;

  const adjMeta = ADJUST_META.find((m) => m.key === adjKey) ?? ADJUST_META[0];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur">
        <Link to="/" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <FiltersTitle className="text-base font-bold tracking-tight" />
        <div className="ml-auto flex items-center gap-1">
          <button type="button" disabled={!canUndo} onClick={onUndo} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" disabled={!canRedo} onClick={onRedo} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
          {busy && <Loader2 className="h-4 w-4 animate-spin text-[#FF5A1F]" />}
        </div>
      </header>

      <div className="relative flex flex-1 flex-col">
        {!sourceUrl ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-10 py-12 text-muted-foreground transition hover:border-[#FF5A1F] hover:text-[#FF5A1F]"
            >
              <ImagePlus className="h-10 w-10" />
              <span className="text-sm font-semibold">Upload a photo</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <>
            <div className="relative mx-auto w-full max-w-lg flex-1 bg-black/5">
              {displayUrl && (
                <img src={displayUrl} alt="Preview" className="h-full w-full object-contain" />
              )}
              {phase === "result" && sourceUrl && comparing && (
                <div className="absolute inset-0">
                  <CompareSlider beforeSrc={sourceUrl} afterSrc={displayUrl || sourceUrl} />
                </div>
              )}
            </div>

            {phase === "result" ? (
              <div className="space-y-3 border-t border-border/60 p-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setComparing((c) => !c)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold"
                  >
                    <Columns2 className="h-4 w-4" /> Compare
                  </button>
                  <button
                    type="button"
                    onClick={onDownload}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] py-2.5 text-sm font-bold text-white"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void onShare()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("edit");
                    setResultUrl((p) => { revokeUrl(p); return null; });
                    setResultWmUrl((p) => { revokeUrl(p); return null; });
                  }}
                  className="w-full text-center text-xs text-muted-foreground underline"
                >
                  Edit again
                </button>
              </div>
            ) : (
              <div className="space-y-3 border-t border-border/60 p-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditorTab("filter")} className={cn("flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wide", editorTab === "filter" ? "bg-[#FF5A1F] text-white" : "bg-muted text-muted-foreground")}>
                    Filter
                  </button>
                  <button type="button" onClick={() => setEditorTab("adjust")} className={cn("flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wide", editorTab === "adjust" ? "bg-[#FF5A1F] text-white" : "bg-muted text-muted-foreground")}>
                    Adjust
                  </button>
                </div>

                {editorTab === "filter" && (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setCategory("all")}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                          category === "all" ? "bg-[#FF5A1F] text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        All
                      </button>
                      {categories.slice(0, 12).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                            category === c ? "bg-[#FF5A1F] text-white" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {filtered.map((item) => {
                        const locked = !isUnlocked(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectFilter(item)}
                            className={cn(
                              "relative flex w-[72px] shrink-0 flex-col items-center gap-1",
                              selectedId === item.id && "opacity-100",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 bg-muted text-[10px] font-bold",
                                selectedId === item.id ? "border-[#FF5A1F]" : "border-transparent",
                                locked && "opacity-60",
                              )}
                            >
                              {item.name.slice(0, 3)}
                            </div>
                            <span className="max-w-[72px] truncate text-[10px] font-medium">{item.name}</span>
                            {item.badge === "ai+" && (
                              <span className="absolute left-0 top-0 rounded bg-[#FF5A1F] px-1 text-[8px] font-bold text-white">AI+</span>
                            )}
                            {locked && <span className="absolute right-0 top-0 text-[10px]">🔒</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 px-1">
                      <span className="text-xs font-semibold text-muted-foreground">Intensity</span>
                      <OrangeSlider value={intensity} min={0} max={100} onChange={(v) => { bumpToEdit(); setIntensity(v); pushHistoryDebounced({ selectedId, intensity: v, adj: { ...adj }, highlightColorId, shadowColorId }); }} ariaLabel="Intensity" />
                      <span className="w-8 text-right text-xs font-bold">{intensity}</span>
                    </div>

                    <button type="button" disabled={applying || busy || (selected ? !isUnlocked(selected) : true)} onClick={() => void onApply()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40">
                      {applying || busy ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Applying…</>) : ("Apply filter")}
                    </button>
                  </>
                )}

                {editorTab === "adjust" && (
                  <div className="space-y-3">
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {ADJUST_META.map((m) => (
                        <button key={m.key} type="button" onClick={() => setAdjKey(m.key)} className={cn("flex min-w-[64px] shrink-0 flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide", adjKey === m.key ? "text-[#FF5A1F]" : "text-muted-foreground")}>
                          <m.icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                          <span className="leading-tight">{m.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-xs font-semibold text-muted-foreground">{adjMeta.label}</span>
                      <OrangeSlider value={adj[adjKey]} min={adjMeta.min} max={adjMeta.max} onChange={(v) => { bumpToEdit(); const next = { ...adj, [adjKey]: v }; setAdj(next); pushHistoryDebounced({ selectedId, intensity, adj: next, highlightColorId, shadowColorId }); }} ariaLabel={adjMeta.label} />
                      <span className="w-10 text-right text-xs font-bold">{adj[adjKey]}</span>
                    </div>
                    {(adjKey === "color" || adjKey === "hue") && (
                      <div className="px-1">
                        <div className="mb-1 flex gap-2">
                          <button type="button" onClick={() => setColorTarget("highlight")} className={cn("text-[11px] font-semibold", colorTarget === "highlight" ? "text-[#FF5A1F]" : "text-muted-foreground")}>
                            Highlight
                          </button>
                          <button type="button" onClick={() => setColorTarget("shadow")} className={cn("text-[11px] font-semibold", colorTarget === "shadow" ? "text-[#FF5A1F]" : "text-muted-foreground")}>
                            Shadow
                          </button>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
