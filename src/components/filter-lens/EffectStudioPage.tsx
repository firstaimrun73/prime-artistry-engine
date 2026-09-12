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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
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

/** Title with subtle sparkle near the i-dot of "Filters". */
function FiltersTitle({ className }: { className?: string }) {
  return (
    <h1 className={className}>
      F
      <span className="relative inline-block">
        i
        <svg
          className="pointer-events-none absolute -right-1.5 -top-1 h-2.5 w-2.5 text-[#FF5A1F]"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden
        >
          <path d="M6 0.5l0.7 3.2 3.3.2-2.5 2.2.8 3.2L6 7.5 3.7 9.3l.8-3.2L2 3.9l3.3-.2L6 0.5z" opacity="0.9" />
        </svg>
      </span>
      lters
    </h1>
  );
}

function OrangeSlider({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className="relative flex h-8 flex-1 items-center">
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-[#E8E0D8]" />
      <div
        className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[#FF5A1F]"
        style={{ width: `${pct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:bg-[#FF5A1F] [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#FF5A1F]
          [&::-webkit-slider-runnable-track]:bg-transparent
          [&::-moz-range-track]:bg-transparent"
      />
    </div>
  );
}

export function EffectStudioPage({
  kind,
  pageMode: _pageMode,
  title,
  subtitle: _subtitle,
  items,
  categories,
  initialSelectedId = null,
}: Props) {
  const { profile } = useAuth();
  const freeUser = !profile || profile.plan === "free" || !profile.plan;

  const [category, setCategory] = useState<string | "all">("all");
  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");
  const [colorId, setColorId] = useState("neutral");

  const sortedCategories = useMemo(() => {
    const preferred = ["Natural", "Portrait", "Cinematic", "Film", "Vintage", "Moody", "Comic", "Sketch", "Retro", "Art", "Neon"];
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
  /** Output watermark toggle — free users forced ON (locked). */
  const [wmEnabled, setWmEnabled] = useState(true);
  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);
  const thumbGen = useRef(0);
  const sourceRgba = useRef<RGBAImage | null>(null);
  const thumbRgba = useRef<RGBAImage | null>(null);
  const selectLock = useRef(false);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const isUnlocked = useCallback(
    (item: CatalogItem) => item.isFree === true,
    [],
  );

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

  const colorTint = useMemo(() => {
    const sw = COLOR_SWATCHES.find((s) => s.id === colorId);
    if (!sw || sw.id === "neutral") return null;
    return sw.rgb;
  }, [colorId]);

  const revokeUrl = (url: string | null | undefined) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const clearThumbs = () => {
    setThumbMap((prev) => {
      for (const u of Object.values(prev)) revokeUrl(u);
      return {};
    });
  };

  const bumpToEdit = () => {
    if (phase === "result") {
      setPhase("edit");
      setResultUrl((prev) => {
        revokeUrl(prev);
        return null;
      });
      setResultWmUrl((prev) => {
        revokeUrl(prev);
        return null;
      });
      setComparing(false);
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
      clearThumbs();
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      thumbRgba.current = downscale(rgba, 160);
      const url = URL.createObjectURL(f);
      setFile(f);
      setSourceUrl(url);
      setPreviewUrl(null);
      setResultUrl(null);
      setResultWmUrl(null);
      setPhase("edit");
      setEditorTab("filter");
      setAdj({ ...DEFAULT_ADJ });
      setColorId("neutral");
      setComparing(false);
      if (!selectedId && items[0]) {
        setSelectedId(items[0].id);
        setIntensity(items[0].intensityDefault);
      }
      toast.success("Photo ready — pick a look");
    } catch (err) {
      console.error(err);
      toast.error("Could not read that photo");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!file || !thumbRgba.current || kind !== "filter") return;
    const gen = ++thumbGen.current;
    let cancelled = false;
    setThumbsBusy(true);
    const run = async () => {
      const base = thumbRgba.current;
      if (!base) return;
      const batch = 8;
      for (let i = 0; i < items.length; i += batch) {
        if (cancelled || gen !== thumbGen.current) return;
        const slice = items.slice(i, i + batch);
        const next: Record<string, string> = {};
        await Promise.all(
          slice.map(async (item) => {
            const def = getFilterById(item.id);
            if (!def) return;
            try {
              const out = applyProcessingProfile(base, def.processingProfile, {
                intensity: item.intensityDefault,
                mode: "preview",
                previewMaxDimension: 160,
                seed: 42,
              });
              if (out.cancelled) return;
              next[item.id] = await rgbaImageToObjectUrl(out.image);
            } catch (e) {
              console.warn("[Motio2edit] thumb failed", item.id, e);
            }
          }),
        );
        if (cancelled || gen !== thumbGen.current) {
          for (const u of Object.values(next)) revokeUrl(u);
          return;
        }
        setThumbMap((prev) => ({ ...prev, ...next }));
      }
      if (gen === thumbGen.current) setThumbsBusy(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [file, items, kind]);

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
        if (cancelled || gen !== previewGen.current || out.cancelled) return;
        if (hasAdj(adj, colorId)) {
          out = { ...out, image: applyUserAdjustments(out.image, adj, colorTint) };
        }
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
  }, [file, selected, intensity, kind, phase, isUnlocked, adj, colorId, colorTint]);

  const selectFilter = (item: CatalogItem) => {
    if (selectLock.current) return;
    selectLock.current = true;
    window.setTimeout(() => {
      selectLock.current = false;
    }, 280);
    if (!isUnlocked(item)) {
      toast.message("Premium filter — upgrade to unlock");
      return;
    }
    bumpToEdit();
    setSelectedId(item.id);
    setIntensity(item.intensityDefault);
    setEditorTab("filter");
  };

  const onApply = async () => {
    if (!file || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) {
      toast.message("Unlock this filter to apply");
      return;
    }
    setBusy(true);
    try {
      const def = getFilterById(selected.id);
      if (!def) throw new Error("Filter not found");
      let out = renderFullResolution(sourceRgba.current, def.processingProfile, {
        intensity,
        mode: "full",
        seed: 42,
      });
      if (out.cancelled) throw new Error("Cancelled");
      if (hasAdj(adj, colorId)) {
        out = { ...out, image: applyUserAdjustments(out.image, adj, colorTint) };
      }
      const url = await rgbaImageToObjectUrl(out.image);
      setResultUrl((prev) => {
        revokeUrl(prev);
        return url;
      });
      // Always bake exact Filters watermark asset for output; free users cannot disable.
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
    }
  };

  const onRestart = () => {
    setPhase("edit");
    setResultUrl((prev) => {
      revokeUrl(prev);
      return null;
    });
    setResultWmUrl((prev) => {
      revokeUrl(prev);
      return null;
    });
    setEditorTab("filter");
    setComparing(false);
  };

  const onDownload = () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm
      ? (resultWmUrl || resultUrl || previewUrl)
      : (resultUrl || resultWmUrl || previewUrl);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `motio2edit-${selected?.name ?? "filter"}.jpg`;
    a.click();
  };

  const resetAdjust = () => {
    setAdj({ ...DEFAULT_ADJ });
    setColorId("neutral");
  };

  const processedUrl = resultUrl || previewUrl;
  const showWm = freeUser || wmEnabled;
  const displayResultUrl = showWm ? (resultWmUrl || resultUrl) : (resultUrl || resultWmUrl);
  const hasPhoto = !!sourceUrl;
  const adjMeta = ADJUST_META.find((m) => m.key === adjKey)!;

  if (!hasPhoto) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#FFFBF7] text-[#161412]">
        <header className="flex items-center gap-3 border-b border-[#E8E0D8] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            to="/"
            className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] bg-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">
              Motio2edit
            </p>
            <FiltersTitle className="truncate text-lg font-bold tracking-tight" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/45 bg-[#FFF1E6] px-6 py-16 transition hover:border-[#FF5A1F] hover:bg-[#FFE6DA]"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/15 text-[#FF5A1F]">
              {busy ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <ImagePlus className="h-7 w-7" />
              )}
            </span>
            <span className="text-base font-semibold">Drop image or tap to upload</span>
            <span className="max-w-xs text-center text-sm text-[#6F6862]">
              Upload a photo to explore looks with live preview
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#FFFBF7] text-[#161412]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E8E0D8] bg-white px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">
            Motio2edit
          </p>
          <FiltersTitle className="truncate text-base font-bold" />
        </div>
        {phase !== "result" ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 text-xs font-semibold"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Photo
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </header>

      <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2">
        {phase === "result" && sourceUrl && displayResultUrl ? (
          comparing ? (
            <CompareSlider
              before={sourceUrl}
              after={displayResultUrl}
              className="max-h-full w-full max-w-full"
            />
          ) : (
            <img
              src={displayResultUrl}
              alt="Result"
              className="max-h-full w-auto max-w-full rounded-xl object-contain"
              draggable={false}
            />
          )
        ) : (
          <img
            src={processedUrl || sourceUrl!}
            alt="Preview"
            className="max-h-full w-auto max-w-full rounded-xl object-contain"
            draggable={false}
          />
        )}
        {busy && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#FFFBF7]/40">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          </div>
        )}
      </section>

      {phase === "result" ? (
        <div className="shrink-0 border-t border-[#E8E0D8] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center justify-around gap-1.5">
            <button
              type="button"
              onClick={onRestart}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-[#161412] active:bg-[#FFF1E6]"
            >
              <RotateCcw className="h-5 w-5" />
              Restart
            </button>
            <button
              type="button"
              onClick={() => setComparing((c) => !c)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold active:bg-[#FFF1E6]",
                comparing ? "text-[#FF5A1F]" : "text-[#161412]",
              )}
            >
              <Columns2 className="h-5 w-5" />
              Compare
            </button>
            <button
              type="button"
              disabled={freeUser}
              onClick={() => {
                if (freeUser) {
                  toast.message("Upgrade to remove watermark");
                  return;
                }
                setWmEnabled((v) => !v);
              }}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold active:bg-[#FFF1E6]",
                freeUser ? "cursor-not-allowed opacity-70 text-[#6F6862]" : "text-[#161412]",
                !freeUser && showWm ? "text-[#FF5A1F]" : null,
              )}
              aria-pressed={showWm}
              aria-label={freeUser ? "Watermark locked on free plan" : "Toggle watermark"}
            >
              <span className="text-base leading-none" aria-hidden>
                {freeUser ? "🔒" : showWm ? "🔓" : "🔓"}
              </span>
              <span className="inline-flex items-center gap-1">
                Watermark
                <span
                  className={cn(
                    "inline-block h-3.5 w-6 rounded-full transition",
                    showWm ? "bg-[#FF5A1F]" : "bg-[#E8E0D8]",
                  )}
                >
                  <span
                    className={cn(
                      "block h-3 w-3 translate-y-[1px] rounded-full bg-white shadow transition",
                      showWm ? "translate-x-[11px]" : "translate-x-[1px]",
                    )}
                  />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-[#161412] active:bg-[#FFF1E6]"
            >
              <Download className="h-5 w-5" />
              Download
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-center gap-8 border-t border-[#E8E0D8]/80 bg-white/90 px-4 pt-2 backdrop-blur-sm">
            {(["filter", "adjust"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEditorTab(tab)}
                className={cn(
                  "relative pb-2 text-xs font-bold tracking-wide uppercase transition",
                  editorTab === tab ? "text-[#FF5A1F]" : "text-[#6F6862]",
                )}
              >
                {tab}
                {editorTab === tab && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#FF5A1F]" />
                )}
              </button>
            ))}
          </div>

          <div className="shrink-0 border-t border-[#E8E0D8]/60 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
            {editorTab === "filter" ? (
              <div className="mx-auto max-w-lg space-y-2 px-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <p className="text-[11px] font-semibold text-[#6F6862]">
                    <span className="font-bold text-[#161412]">100+</span> AI Filters
                  </p>
                  <div className="flex gap-1 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setCategory("all")}
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        category === "all" ? "bg-[#FF5A1F] text-white" : "bg-[#FFF1E6] text-[#6F6862]",
                      )}
                    >
                      All
                    </button>
                    {sortedCategories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                          category === c ? "bg-[#FF5A1F] text-white" : "bg-[#FFF1E6] text-[#6F6862]",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {filtered.map((item) => {
                    const unlocked = isUnlocked(item);
                    const active = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectFilter(item)}
                        className={cn(
                          "relative h-[72px] w-[64px] shrink-0 overflow-hidden rounded-xl border-2",
                          active ? "border-[#FF5A1F]" : "border-transparent",
                        )}
                      >
                        {thumbMap[item.id] ? (
                          <img src={thumbMap[item.id]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-[#E8E0D8]" />
                        )}
                        {active && (
                          <span className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#FF5A1F]">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </span>
                        )}
                        {item.badge === "ai+" && (
                          <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1 py-0.5 text-[8px] font-bold tracking-wide text-[#FF8A4C] shadow-sm">
                            AI+
                          </span>
                        )}
                        {item.badge === "pro" && (
                          <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1 py-0.5 text-[8px] font-bold tracking-wide text-[#7DD3FC] shadow-sm">
                            PRO
                          </span>
                        )}
                        {item.badge === "premium" && (
                          <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1 py-0.5 text-[8px] font-bold tracking-wide text-amber-300 shadow-sm">
                            PREMIUM
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
                              <path d="M6 1.2l1.4 2.6 2.9.5-2 2.1.4 2.9L6 8.1 3.3 9.3l.4-2.9-2-2.1 2.9-.5L6 1.2z" />
                            </svg>
                          </span>
                        )}
                        {item.animatedThumb && item.badge === "ai+" && (
                          <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-[#FF5A1F]/35 animate-pulse" />
                        )}
                        {!unlocked && (
                          <>
                            <span className="absolute inset-0 bg-black/25" />
                            <span className="absolute right-1 top-1 text-[11px] leading-none drop-shadow" aria-hidden>
                              🔒
                            </span>
                          </>
                        )}
                        {unlocked && item.badge && !freeUser && (
                          <span className="absolute right-1 top-1 text-[10px] leading-none drop-shadow" aria-hidden>
                            🔓
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1 pb-1 pt-3 text-center text-[9px] font-medium text-white">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 px-1">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-[#6F6862]">
                    Intensity
                  </span>
                  <OrangeSlider
                    value={intensity}
                    min={0}
                    max={100}
                    onChange={(v) => {
                      bumpToEdit();
                      setIntensity(v);
                    }}
                    ariaLabel="Intensity"
                  />
                  <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-[#161412]">
                    {intensity}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={busy || (selected ? !isUnlocked(selected) : true)}
                  onClick={() => void onApply()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                    </>
                  ) : (
                    "Apply filter"
                  )}
                </button>
              </div>
            ) : (
              <div className="mx-auto max-w-lg space-y-3 px-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ADJUST_META.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setAdjKey(m.key)}
                        className={cn(
                          "flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold",
                          adjKey === m.key ? "bg-[#FFF1E6] text-[#FF5A1F]" : "text-[#6F6862]",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 px-1">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-[#6F6862]">
                    {adjMeta.label}
                  </span>
                  <OrangeSlider
                    value={adj[adjKey]}
                    min={adjMeta.min}
                    max={adjMeta.max}
                    onChange={(v) => {
                      bumpToEdit();
                      setAdj((prev) => ({ ...prev, [adjKey]: v }));
                    }}
                    ariaLabel={adjMeta.label}
                  />
                  <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-[#161412]">
                    {adj[adjKey]}
                  </span>
                </div>

                {adjKey === "color" && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => {
                          bumpToEdit();
                          setColorId(sw.id);
                        }}
                        className={cn(
                          "h-7 w-7 rounded-full border-2",
                          colorId === sw.id ? "border-[#FF5A1F]" : "border-transparent",
                        )}
                        style={{
                          backgroundColor: `rgb(${sw.rgb[0]},${sw.rgb[1]},${sw.rgb[2]})`,
                        }}
                        aria-label={sw.label}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy || (selected ? !isUnlocked(selected) : true)}
                  onClick={() => void onApply()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                    </>
                  ) : (
                    "Apply filter"
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
