import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Columns2,
  Download,
  ImagePlus,
  Loader2,
  Lock,
  Search,
  Upload,
  X,
} from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
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
import type { FilterDefinition } from "@/lib/filter-lens/filters/filter-types";
import type { RGBAImage } from "@/lib/filter-lens/shared/processing-types";
import { chargeFilterUnlock } from "@/lib/filter-lens/unlock.functions";

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  description?: string;
  intensityDefault: number;
  isFree: boolean;
  kind: "filter" | "lens";
};

export function filterToCatalogItem(f: FilterDefinition): CatalogItem {
  return {
    id: f.id,
    name: f.name,
    category: f.category,
    description: f.description,
    intensityDefault: f.intensityRange?.default ?? 85,
    isFree: !!f.unlock?.isFree,
    kind: "filter",
  };
}

type Props = {
  kind: "filter" | "lens";
  pageMode: "discover" | "edit";
  title: string;
  subtitle: string;
  items: CatalogItem[];
  categories: string[];
  initialSelectedId?: string | null;
};

/**
 * YouCut-style filter studio:
 * - No filter strip until a photo is uploaded
 * - Every thumbnail is the user photo with that look applied (live, no stock thumbs)
 * - Intensity + apply + download
 */
export function EffectStudioPage({
  kind,
  pageMode: _pageMode,
  title,
  subtitle,
  items,
  categories,
  initialSelectedId = null,
}: Props) {
  const { user } = useAuth();
  const chargeUnlock = useServerFn(chargeFilterUnlock);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const [searchOpen, setSearchOpen] = useState(false);

  const sortedCategories = useMemo(() => {
    const preferred = ["Natural", "Portrait", "Cinematic", "Film", "Vintage", "Moody"];
    const head = preferred.filter((c) => categories.includes(c));
    const rest = categories.filter((c) => !preferred.includes(c));
    return [...head, ...rest];
  }, [categories]);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(85);
  const [busy, setBusy] = useState(false);
  const [thumbsBusy, setThumbsBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "edit" | "result">("idle");
  const [comparing, setComparing] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);
  const thumbGen = useRef(0);
  const sourceRgba = useRef<RGBAImage | null>(null);
  const thumbRgba = useRef<RGBAImage | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const isUnlocked = useCallback(
    (id: string, isFree: boolean) => {
      if (isFree) return true;
      if (unlockedIds.has(id)) return true;
      return false;
    },
    [unlockedIds],
  );

  const filtered = useMemo(() => {
    let list = items;
    if (category !== "all") list = list.filter((i) => i.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, category, query]);

  const revokeUrl = (url: string | null | undefined) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  const clearThumbs = () => {
    setThumbMap((prev) => {
      for (const u of Object.values(prev)) revokeUrl(u);
      return {};
    });
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
      clearThumbs();

      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      thumbRgba.current = downscale(rgba, 160);

      const url = URL.createObjectURL(f);
      setFile(f);
      setSourceUrl(url);
      setPreviewUrl(null);
      setResultUrl(null);
      setPhase("edit");
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

  // Live thumbs from the uploaded photo (batched)
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
              const url = await rgbaImageToObjectUrl(out.image);
              next[item.id] = url;
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

  // Main live preview for selected filter
  useEffect(() => {
    if (!file || !selected || kind !== "filter" || phase === "result") return;
    if (!isUnlocked(selected.id, selected.isFree)) return;
    if (!sourceRgba.current) return;

    const gen = ++previewGen.current;
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const def = getFilterById(selected.id);
        if (!def) return;
        const scaled = downscale(sourceRgba.current!, 720);
        const out = applyProcessingProfile(scaled, def.processingProfile, {
          intensity,
          mode: "preview",
          previewMaxDimension: 720,
          seed: 42,
        });
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
  }, [file, selected, intensity, kind, phase, isUnlocked]);

  const onApply = async () => {
    if (!file || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected.id, selected.isFree)) {
      toast.message("Unlock this filter to apply");
      return;
    }
    setBusy(true);
    try {
      const def = getFilterById(selected.id);
      if (!def) throw new Error("Filter not found");
      const out = renderFullResolution(sourceRgba.current, def.processingProfile, {
        intensity,
        mode: "full",
        seed: 42,
      });
      if (out.cancelled) throw new Error("Cancelled");
      const url = await rgbaImageToObjectUrl(out.image);
      setResultUrl((prev) => {
        revokeUrl(prev);
        return url;
      });
      setPhase("result");
      toast.success("Filter applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const onUnlock = async (item: CatalogItem) => {
    if (!user) {
      toast.message("Sign in to unlock premium filters");
      return;
    }
    try {
      await chargeUnlock({ data: { kind: "filter", itemId: item.id } });
      setUnlockedIds((s) => new Set(s).add(item.id));
      toast.success(`${item.name} unlocked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    }
  };

  const processedUrl = resultUrl || previewUrl;
  const hasPhoto = !!sourceUrl;

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
            <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
            <p className="truncate text-[11px] text-[#6F6862]">{subtitle}</p>
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
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
            </span>
            <span className="text-base font-semibold">Drop image or tap to upload</span>
            <span className="max-w-xs text-center text-sm text-[#6F6862]">
              On-device filters · no generative AI. Live previews use{" "}
              <strong className="font-semibold text-[#161412]">your</strong> photo — no 100 thumbnail
              uploads needed.
            </span>
          </button>
          <p className="mt-6 text-center text-xs text-[#A39C96]">
            {items.length} looks unlock after you upload
          </p>
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
    <div className="flex min-h-[100dvh] flex-col bg-[#FFFBF7] text-[#161412]">
      <header className="flex items-center gap-3 border-b border-[#E8E0D8] bg-white px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
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
          <h1 className="truncate text-base font-bold">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 text-xs font-semibold"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Replace
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </header>

      <section
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2"
        onPointerDown={() => setComparing(true)}
        onPointerUp={() => setComparing(false)}
        onPointerLeave={() => setComparing(false)}
        onPointerCancel={() => setComparing(false)}
      >
        {phase === "result" && sourceUrl && resultUrl ? (
          <div className="w-full max-w-lg" onPointerDown={(e) => e.stopPropagation()}>
            <CompareSlider before={sourceUrl} after={resultUrl} />
          </div>
        ) : comparing ? (
          <img
            src={sourceUrl!}
            alt="Original"
            className="max-h-[min(48dvh,520px)] w-auto max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <img
            src={processedUrl || sourceUrl!}
            alt="Preview"
            className="max-h-[min(48dvh,520px)] w-auto max-w-full rounded-xl object-contain"
            draggable={false}
          />
        )}
        {busy && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#FFFBF7]/40">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          </div>
        )}
      </section>

      <div className="flex items-center justify-center gap-8 border-t border-[#E8E0D8] bg-white py-2">
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-[#FF5A1F]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FF5A1F]/12">
            <Columns2 className="h-4 w-4" />
          </span>
          Filters
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-[#6F6862]"
          onClick={() => toast.message("Adjust panel coming soon")}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F3EEE8]">
            <Search className="h-4 w-4" />
          </span>
          Adjust
        </button>
      </div>

      <div className="border-t border-[#E8E0D8] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
              category === "all"
                ? "bg-[#FF5A1F] text-white"
                : "bg-[#F3EEE8] text-[#6F6862]",
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
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                category === c ? "bg-[#FF5A1F] text-white" : "bg-[#F3EEE8] text-[#6F6862]",
              )}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F3EEE8]"
            aria-label="Search"
          >
            {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          </button>
        </div>

        {searchOpen ? (
          <div className="px-3 pb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search filters…"
              className="w-full rounded-xl border border-[#E8E0D8] bg-[#FFFBF7] px-3 py-2 text-sm outline-none focus:border-[#FF5A1F]"
            />
          </div>
        ) : null}

        <div className="space-y-2 px-3 pb-3">
          {thumbsBusy && Object.keys(thumbMap).length < items.length ? (
            <p className="text-center text-[10px] text-[#A39C96]">Building live previews…</p>
          ) : null}

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible">
            {filtered.map((item) => {
              const locked = !isUnlocked(item.id, item.isFree);
              const active = selectedId === item.id;
              const thumb = thumbMap[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      void onUnlock(item);
                      return;
                    }
                    setSelectedId(item.id);
                    setIntensity(item.intensityDefault);
                    if (phase === "result") setPhase("edit");
                  }}
                  className={cn(
                    "relative w-[72px] shrink-0 overflow-hidden rounded-xl border-2 transition sm:w-[84px]",
                    active ? "border-[#FF5A1F]" : "border-transparent",
                  )}
                >
                  <div className="aspect-square bg-[#E8E0D8]">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-[#A39C96]" />
                      </div>
                    )}
                    {locked ? (
                      <span className="absolute inset-0 grid place-items-center bg-black/40">
                        <Lock className="h-4 w-4 text-white" />
                      </span>
                    ) : null}
                    {active ? (
                      <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#FF5A1F]">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    ) : null}
                  </div>
                  <span className="block truncate bg-[#141210] px-1 py-0.5 text-center text-[9px] font-semibold tracking-wide text-[#FFFBF7] uppercase">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="flex items-center gap-3 pt-1">
              <span className="w-16 text-xs font-medium text-[#6F6862]">Intensity</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={intensity}
                onChange={(e) => {
                  setIntensity(Number(e.target.value));
                  if (phase === "result") {
                    setPhase("edit");
                    setResultUrl((prev) => {
                      revokeUrl(prev);
                      return null;
                    });
                  }
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#E8E0D8] accent-[#FF5A1F]"
              />
              <span className="w-8 text-right text-sm font-semibold tabular-nums">{intensity}</span>
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={!selected || busy || (selected ? !isUnlocked(selected.id, selected.isFree) : true)}
              onClick={() => void onApply()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                </>
              ) : phase === "result" ? (
                <>
                  <Check className="h-4 w-4" /> Applied
                </>
              ) : (
                "Apply filter"
              )}
            </button>
            {resultUrl ? (
              <a
                href={resultUrl}
                download={`motio2edit-${selected?.name ?? "filter"}.jpg`}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-[#E8E0D8]"
                aria-label="Download"
              >
                <Download className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
