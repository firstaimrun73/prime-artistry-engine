import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Lock, Search, Upload, X, Loader2, Download,
} from "lucide-react";
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
import type { ProcessingProfile } from "@/lib/filter-lens/shared/processing-types";
import { unlockFilterOrLens } from "@/lib/filter-lens/unlock.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import type { FilterDefinition } from "@/lib/filter-lens/filters/filter-types";

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
  };
}

type Props = {
  kind: EffectKind;
  title: string;
  subtitle: string;
  items: CatalogItem[];
  categories: string[];
  pageMode?: "discover" | "edit";
  initialSelectedId?: string | null;
};

export function EffectStudioPage({
  kind,
  title,
  subtitle,
  items,
  categories,
  pageMode = "discover",
  initialSelectedId = null,
}: Props) {
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
      toast.success(`Applied · Δ ${mad.toFixed(1)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const processedUrl = resultUrl || previewUrl;
  const displayUrl = showOriginal ? sourceUrl : processedUrl || sourceUrl;

  const glassPanel = isDark
    ? "border-white/15 bg-black/45 text-white shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
    : "border-black/10 bg-white/55 text-[#1A1C24] shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl";
  const glassChip = isDark
    ? "border-white/12 bg-white/8 text-white/80 hover:bg-white/14"
    : "border-black/8 bg-white/70 text-[#3A3F4C] hover:bg-white/90";
  const glassChipActive =
    "border-orange-400/70 bg-orange-500/90 text-white shadow-[0_0_20px_rgba(249,115,22,0.45)] scale-[1.04]";
  const scrollHide =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div
      className={cn(
        "relative flex min-h-[100dvh] flex-col overflow-hidden",
        isDark
          ? "bg-[radial-gradient(ellipse_80%_60%_at_20%_10%,rgba(249,115,22,0.18),transparent_50%),radial-gradient(ellipse_70%_50%_at_90%_80%,rgba(139,92,246,0.14),transparent_45%),linear-gradient(160deg,#0a0a0c_0%,#141018_50%,#1a0f0a_100%)] text-white"
          : "bg-[radial-gradient(ellipse_80%_50%_at_15%_0%,rgba(249,115,22,0.12),transparent_45%),radial-gradient(ellipse_60%_40%_at_90%_100%,rgba(139,92,246,0.1),transparent_40%),linear-gradient(180deg,#f8f6f3_0%,#efeae4_100%)] text-[#1A1C24]",
      )}
    >
      <header
        className={cn(
          "relative z-30 flex items-center gap-2 border-b px-3 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))]",
          isDark ? "border-white/10 bg-black/30 backdrop-blur-xl" : "border-black/8 bg-white/50 backdrop-blur-xl",
        )}
      >
        <Link
          to="/"
          className={cn(
            "grid h-10 w-10 place-items-center rounded-full border transition active:scale-95",
            isDark ? "border-white/15 bg-white/10" : "border-black/10 bg-white/80",
          )}
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-500">Motio2edit</p>
          <h1 className="truncate text-base font-extrabold tracking-tight sm:text-lg">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn("hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:inline-flex", glassChip)}
        >
          <Upload className="h-3.5 w-3.5" /> Upload
        </button>
        <div
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums",
            isDark ? "border-white/12 bg-white/10" : "border-black/8 bg-white/80",
          )}
        >
          {isAdmin ? "Admin" : `${credits} cr`}
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-3 pb-[min(42vh,22rem)] pt-3 sm:pb-48">
        <div
          className={cn(
            "relative flex w-full max-w-3xl items-center justify-center overflow-hidden rounded-[1.35rem] border",
            isDark ? "border-white/10 bg-black/40" : "border-black/8 bg-white/40",
            "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)]",
          )}
        >
          {displayUrl ? (
            <div className="relative flex max-h-[min(52dvh,560px)] w-full items-center justify-center p-2">
              <img
                key={displayUrl}
                src={displayUrl}
                alt={showOriginal ? "Original" : "Filtered"}
                className="max-h-[min(52dvh,560px)] max-w-full object-contain transition duration-300"
                draggable={false}
              />
              {processedUrl && sourceUrl ? (
                <button
                  type="button"
                  className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
                  onPointerDown={() => setShowOriginal(true)}
                  onPointerUp={() => setShowOriginal(false)}
                  onPointerLeave={() => setShowOriginal(false)}
                >
                  {showOriginal ? "Original" : "Hold = Original"}
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "m-4 flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-16 text-center transition",
                isDark
                  ? "border-orange-400/35 bg-orange-500/5 hover:border-orange-400/55 hover:bg-orange-500/10"
                  : "border-orange-500/40 bg-orange-500/5 hover:border-orange-500/60 hover:bg-orange-500/10",
              )}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/20 text-orange-500">
                <Upload className="h-7 w-7" />
              </span>
              <span className="text-sm font-bold">Drop image or tap to upload</span>
              <span className={cn("text-xs", isDark ? "text-white/50" : "text-black/50")}>
                On-device filters · no generative AI
              </span>
            </button>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
          glassPanel,
        )}
      >
        <div className="mx-auto max-w-3xl space-y-2.5">
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3 py-2",
              isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-white/60",
            )}
          >
            <Search className={cn("h-4 w-4 shrink-0", isDark ? "text-white/45" : "text-black/40")} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${kind === "filter" ? "filters" : "lenses"}…`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X className="h-4 w-4 opacity-60" />
              </button>
            ) : null}
          </div>

          <div className={cn("flex gap-1.5 overflow-x-auto pb-0.5", scrollHide)}>
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                category === "all" ? glassChipActive : glassChip,
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
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                  category === c ? glassChipActive : glassChip,
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className={cn("flex gap-2 overflow-x-auto py-1", scrollHide)} role="listbox" aria-label="Filters">
            {filtered.map((item) => {
              const active = selectedId === item.id;
              const locked = !isUnlocked(item.id, item.isFree);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedId(item.id);
                    setIntensity(item.intensityDefault);
                    setResultUrl(null);
                  }}
                  className={cn(
                    "relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-2xl border p-2 transition duration-200",
                    active ? glassChipActive : glassChip,
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl text-[9px] font-black uppercase tracking-wide",
                      active
                        ? "bg-white/25 text-white"
                        : isDark
                          ? "bg-orange-500/15 text-orange-300"
                          : "bg-orange-500/12 text-orange-600",
                    )}
                  >
                    {item.name.slice(0, 2)}
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">{item.name}</span>
                  {item.isFree ? (
                    <span className="text-[8px] font-bold text-emerald-400">Free</span>
                  ) : locked ? (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-orange-300">
                      <Lock className="h-2.5 w-2.5" />
                      {item.unlockCost}
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-orange-300">Owned</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className={cn("px-2 py-4 text-xs", isDark ? "text-white/45" : "text-black/45")}>
                No filters match.
              </p>
            )}
          </div>

          {selected ? (
            <div className="space-y-2 border-t border-white/10 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{selected.name}</p>
                  <p className={cn("truncate text-[11px]", isDark ? "text-white/50" : "text-black/50")}>
                    {selected.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full opacity-60"
                  aria-label="Deselect"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="flex items-center gap-3 text-[11px] font-medium">
                <span className="w-16 shrink-0 opacity-70">Intensity</span>
                <input
                  type="range"
                  min={selected.intensityMin}
                  max={selected.intensityMax}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-orange-500/25 accent-orange-500"
                />
                <span className="w-8 text-right tabular-nums text-orange-400">{intensity}</span>
              </label>
              <div className="flex gap-2">
                {!selected.isFree && !isUnlocked(selected.id, selected.isFree) ? (
                  <button
                    type="button"
                    onClick={() => void onUnlock()}
                    disabled={busy}
                    className="flex-1 rounded-2xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] disabled:opacity-40"
                  >
                    Unlock · {selected.unlockCost} credits
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onApply()}
                    disabled={busy || !file}
                    className="flex-1 rounded-2xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] disabled:opacity-40"
                  >
                    {busy ? "Working…" : file ? "Apply filter" : "Upload image first"}
                  </button>
                )}
                {resultUrl ? (
                  <button
                    type="button"
                    onClick={() => void triggerBrowserDownload(resultUrl, `motio2edit-${selected.id}.jpg`)}
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-2xl border",
                      isDark ? "border-white/15 bg-white/10" : "border-black/10 bg-white/70",
                    )}
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className={cn("pb-1 text-center text-[11px]", isDark ? "text-white/40" : "text-black/40")}>
              Upload a photo · pick a floating filter · adjust intensity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
