import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Lock, Search, Upload, X, Check, Loader2, Download, Info,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { fileToRGBAImage, rgbaImageToObjectUrl, meanAbsDiff } from "@/lib/filter-lens/client/image-bridge";
import { cloneImage, downscale } from "@/lib/filter-lens/filters/filter-engine";
import {
  ClientFilterUnlockStore,
  ClientLensUnlockStore,
} from "@/lib/filter-lens/client/unlock-client";
import { canUseFilter } from "@/lib/filter-lens/filters/filter-unlock";
import { canUseLens } from "@/lib/filter-lens/lenses/lens-unlock";
import { renderPreview, renderFullResolution } from "@/lib/filter-lens/filters/filter-engine";
import { renderLensPreview, renderLensFullResolution } from "@/lib/filter-lens/lenses/lens-engine";
import type { FilterDefinition } from "@/lib/filter-lens/filters/filter-types";
import type { LensDefinition } from "@/lib/filter-lens/lenses/lens-types";
import type { ProcessingProfile } from "@/lib/filter-lens/shared/processing-types";
import { unlockFilterOrLens } from "@/lib/filter-lens/unlock.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";

export type EffectKind = "filter" | "lens";

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  visualDescription: string;
  isFree: boolean;
  unlockCost: number;
  profile: ProcessingProfile;
  intensityDefault: number;
  intensityMin: number;
  intensityMax: number;
  bestFor?: string;
};

type Props = {
  kind: EffectKind;
  title: string;
  subtitle: string;
  items: CatalogItem[];
  categories: string[];
  pageMode?: "discover" | "edit";
  initialSelectedId?: string | null;
};

export function EffectStudioPage({ kind, title, subtitle, items, categories, pageMode = "discover", initialSelectedId = null }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isAdmin = isAdminEmail(profile?.email);
  const unlockFn = useServerFn(unlockFilterOrLens);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(80);
  const [busy, setBusy] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [lastMad, setLastMad] = useState<number | null>(null);
  const [credits, setCredits] = useState(profile?.credits ?? 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);

  useEffect(() => {
    setCredits(profile?.credits ?? 0);
  }, [profile?.credits]);

  const userId = profile?.id ?? user?.id ?? "anon";

  const filterStore = useMemo(
    () => new ClientFilterUnlockStore(userId, credits, setCredits),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, profile?.credits],
  );
  const lensStore = useMemo(
    () => new ClientLensUnlockStore(userId, credits, setCredits),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, profile?.credits],
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const isUnlocked = useCallback(
    (id: string, free: boolean) => {
      if (free || isAdmin) return true;
      if (kind === "filter") return canUseFilter(id, filterStore);
      return canUseLens(id, lensStore);
    },
    [kind, filterStore, lensStore, isAdmin],
  );

  const filtered = useMemo(() => {
    let list = items;
    if (category !== "all") list = list.filter((i) => i.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.id.includes(q),
      );
    }
    return list;
  }, [items, category, query]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setFile(f);
    setSourceUrl(URL.createObjectURL(f));
    setPreviewUrl(null);
    setResultUrl(null);
    setLastMad(null);
    setShowOriginal(false);
  };

  useEffect(() => {
    if (!file || !selected || !sourceUrl) {
      setPreviewUrl(null);
      setLastMad(null);
      return;
    }
    if (!isUnlocked(selected.id, selected.isFree)) {
      setPreviewUrl(null);
      setLastMad(null);
      return;
    }
    if (!selected.profile || Object.keys(selected.profile).length === 0) {
      toast.error("This effect has no processing profile");
      setPreviewUrl(null);
      return;
    }
    const gen = ++previewGen.current;
    let cancelled = false;
    const safeIntensity = Number.isFinite(intensity) ? Math.max(0, Math.min(100, intensity)) : 85;
    (async () => {
      try {
        setBusy(true);
        const rgba = await fileToRGBAImage(file);
        const opts = {
          intensity: safeIntensity,
          mode: "preview" as const,
          previewMaxDimension: 720,
          seed: 42,
          isCancelled: () => cancelled || gen !== previewGen.current,
        };
        const before = downscale(rgba, opts.previewMaxDimension);
        let result =
          kind === "filter"
            ? renderPreview(rgba, selected.profile, opts)
            : renderLensPreview(rgba, selected.profile, opts);
        if (result.cancelled || gen !== previewGen.current) return;

        let mad = meanAbsDiff(before, result.image);
        if (mad < 2.5 && safeIntensity < 100) {
          const boostOpts = { ...opts, intensity: 100 };
          result =
            kind === "filter"
              ? renderPreview(rgba, selected.profile, boostOpts)
              : renderLensPreview(rgba, selected.profile, boostOpts);
          if (result.cancelled || gen !== previewGen.current) return;
          mad = meanAbsDiff(before, result.image);
        }
        if (mad < 1.0) {
          console.warn("[Motio2edit] effect produced near-zero pixel change", selected.id, mad, selected.profile);
        }
        const url = await rgbaImageToObjectUrl(result.image);
        if (gen !== previewGen.current) return;
        setPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
        setLastMad(mad);
        setShowOriginal(false);
      } catch (err) {
        console.error("[Motio2edit] preview failed", err);
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Preview failed");
      } finally {
        if (gen === previewGen.current) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, selectedId, intensity, kind]);

  const onUnlock = async () => {
    if (!selected || !user) {
      toast.message("Sign in to unlock");
      return;
    }
    if (isUnlocked(selected.id, selected.isFree)) return;
    try {
      setBusy(true);
      const res = await unlockFn({ data: { kind, effectId: selected.id } });
      if (!res?.ok) {
        toast.error(res?.error || "Unlock failed");
        return;
      }
      if (kind === "filter") {
        filterStore.markUnlockedFromServer(selected.id, res.credits ?? credits);
      } else {
        lensStore.markUnlockedFromServer(selected.id, res.credits ?? credits);
      }
      if (typeof res.credits === "number") setCredits(res.credits);
      await refreshProfile?.();
      toast.success("Unlocked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  };

  const onApply = async () => {
    if (!file || !selected) return;
    if (!isUnlocked(selected.id, selected.isFree)) {
      toast.message("Unlock this effect first");
      return;
    }
    try {
      setBusy(true);
      const rgba = await fileToRGBAImage(file);
      const before = cloneImage(rgba);
      const safeIntensity = Number.isFinite(intensity) ? Math.max(0, Math.min(100, intensity)) : 100;
      const opts = { intensity: safeIntensity, mode: "full" as const, seed: 42 };
      let result =
        kind === "filter"
          ? renderFullResolution(rgba, selected.profile, opts)
          : renderLensFullResolution(rgba, selected.profile, opts);
      if (result.cancelled) return;
      let mad = meanAbsDiff(before, result.image);
      if (mad < 2.5) {
        result =
          kind === "filter"
            ? renderFullResolution(rgba, selected.profile, { ...opts, intensity: 100 })
            : renderLensFullResolution(rgba, selected.profile, { ...opts, intensity: 100 });
        mad = meanAbsDiff(before, result.image);
      }
      const url = await rgbaImageToObjectUrl(result.image);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setLastMad(mad);
      setShowOriginal(false);
      if (mad < 1.5) {
        toast.message(`Applied (weak Δ ${mad.toFixed(1)}) — try another effect`);
      } else {
        toast.success(`Applied · visible Δ ${mad.toFixed(1)}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const processedUrl = resultUrl || previewUrl;
  const displayUrl = showOriginal ? sourceUrl : (processedUrl || sourceUrl);

  return (
    <div className={cn("min-h-[100dvh]", isDark ? "bg-[#12141A] text-[#F2F2F5]" : "bg-[#F4F5F8] text-[#1A1C24]")}>
      <Header />
      <main className={cn("mx-auto flex max-w-6xl flex-col gap-3 px-3 pt-3 sm:px-4", selected ? "pb-56 sm:pb-12" : "pb-24 sm:pb-12")}>
        <div className="flex items-center gap-2">
          <Link
            to="/studio/image/tools"
            className={cn("grid h-9 w-9 place-items-center rounded-lg border", isDark ? "border-white/10" : "border-black/8")}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            <p className={cn("truncate text-[11px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{subtitle}</p>
          </div>
          <div className={cn("shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium tabular-nums", isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white")}>
            {isAdmin ? "Admin" : `${credits} credits`}
          </div>
        </div>

        <div className={cn("relative flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-2xl border", isDark ? "border-white/10 bg-[#181A22]" : "border-black/8 bg-white")}>
          {displayUrl ? (
            <div className="relative flex max-h-[52vh] w-full items-center justify-center">
              <img
                key={displayUrl}
                src={displayUrl}
                alt={showOriginal ? "Original" : "Processed"}
                className="max-h-[52vh] max-w-full object-contain"
              />
              {processedUrl && sourceUrl ? (
                <button
                  type="button"
                  className="absolute bottom-2 right-2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
                  onPointerDown={() => setShowOriginal(true)}
                  onPointerUp={() => setShowOriginal(false)}
                  onPointerLeave={() => setShowOriginal(false)}
                >
                  {showOriginal ? "Original" : "Hold = Original"}
                </button>
              ) : null}
              {lastMad != null && processedUrl ? (
                <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/90">
                  Δ {lastMad.toFixed(1)}
                </span>
              ) : null}
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Upload className="h-8 w-8 text-[#7B6FE0]" />
              <span className="text-sm font-semibold">Upload a photo</span>
              <span className={cn("text-xs", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
                Preview applies on device — no generative AI
              </span>
            </button>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

        <div className="flex flex-col gap-2">
          <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white")}>
            <Search className={cn("h-4 w-4", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${kind === "filter" ? "filters" : "lenses"}…`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear">
                <X className="h-4 w-4 opacity-60" />
              </button>
            ) : null}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
                category === "all" ? "bg-[#7B6FE0] text-white" : isDark ? "bg-white/8 text-[#C8CCD8]" : "bg-black/5 text-[#3A3F4C]",
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
                  category === c ? "bg-[#7B6FE0] text-white" : isDark ? "bg-white/8 text-[#C8CCD8]" : "bg-black/5 text-[#3A3F4C]",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((item) => {
            const active = selectedId === item.id;
            const locked = !isUnlocked(item.id, item.isFree);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setIntensity(item.intensityDefault);
                  setResultUrl(null);
                }}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-xl border p-2 text-left transition-colors",
                  isDark ? "bg-white/5 border-white/10" : "bg-white/80 border-black/8",
                  active && "border-[#7B6FE0] ring-1 ring-[#7B6FE0]/40",
                )}
              >
                <div className={cn("mb-2 flex aspect-[4/3] items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wide", isDark ? "bg-[#7B6FE0]/15 text-[#B8B0F0]" : "bg-[#7B6FE0]/10 text-[#5C52C0]")}>
                  {item.name.slice(0, 18)}
                </div>
                <p className="truncate text-[12px] font-semibold">{item.name}</p>
                <p className={cn("mt-0.5 line-clamp-2 text-[10px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{item.description}</p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium">
                  {item.isFree ? (
                    <span className="text-emerald-500">Free</span>
                  ) : locked ? (
                    <span className="inline-flex items-center gap-0.5 text-[#7B6FE0]">
                      <Lock className="h-3 w-3" /> {item.unlockCost}
                    </span>
                  ) : (
                    <span className="text-[#7B6FE0]">Owned</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:rounded-2xl sm:border",
              isDark ? "border-white/10 bg-[#181A22]/95" : "border-black/8 bg-white/95",
            )}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{selected.name}</p>
                  <p className={cn("mt-0.5 text-[11px] leading-snug", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>{selected.description}</p>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="p-1 opacity-60" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="flex items-center gap-3 text-[11px] font-medium">
                <span className="w-16 shrink-0">Intensity</span>
                <input
                  type="range"
                  min={selected.intensityMin}
                  max={selected.intensityMax}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-[#7B6FE0]"
                />
                <span className="w-8 tabular-nums">{intensity}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {!isUnlocked(selected.id, selected.isFree) ? (
                  <button type="button" disabled={busy} onClick={() => void onUnlock()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#7B6FE0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    <Lock className="h-4 w-4" /> Unlock · {selected.unlockCost}
                  </button>
                ) : (
                  <>
                    <button type="button" disabled={busy || !file} onClick={() => void onApply()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#7B6FE0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      <Check className="h-4 w-4" />
                      Apply full resolution
                    </button>
                    {resultUrl ? (
                      <button
                        type="button"
                        onClick={() => void triggerBrowserDownload(resultUrl, `motio2edit-${kind}-${Date.now()}.png`)}
                        className={cn("inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold", isDark ? "border-white/15" : "border-black/10")}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    ) : null}
                  </>
                )}
                <button type="button" onClick={() => fileRef.current?.click()} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", isDark ? "border-white/15" : "border-black/10")}>
                  Change photo
                </button>
              </div>
              <p className={cn("flex items-center gap-1 text-[10px]", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
                <Info className="h-3 w-3" />
                Original Motio2edit processing · on-device · hold preview to compare original
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function filterToCatalogItem(f: FilterDefinition): CatalogItem {
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    description: f.description,
    visualDescription: f.visualDescription,
    isFree: f.unlock.isFree,
    unlockCost: f.unlock.unlockCost,
    profile: f.processingProfile,
    intensityDefault: f.intensityRange.default,
    intensityMin: f.intensityRange.min,
    intensityMax: f.intensityRange.max,
    bestFor: f.category,
  };
}

export function lensToCatalogItem(l: LensDefinition): CatalogItem {
  return {
    id: l.id,
    name: l.name,
    category: l.specialty,
    description: l.description,
    visualDescription: l.visualDescription,
    isFree: l.unlock.isFree,
    unlockCost: l.unlock.unlockCost,
    profile: l.processingProfile,
    intensityDefault: l.intensityRange.default,
    intensityMin: l.intensityRange.min,
    intensityMax: l.intensityRange.max,
    bestFor: l.recommendedSubjects || l.recommendedLighting,
  };
}
