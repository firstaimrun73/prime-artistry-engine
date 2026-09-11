import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Lock,
  Search,
  Upload,
  X,
  Loader2,
  Download,
  Share2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CompareSlider } from "@/components/CompareSlider";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  fileToRGBAImage,
  rgbaImageToObjectUrl,
  meanAbsDiff,
  downscale,
} from "@/lib/filter-lens/client/image-bridge";
import {
  renderPreview,
  renderFullResolution,
} from "@/lib/filter-lens/filters/filter-engine";
import { getFilterById } from "@/lib/filter-lens/filters/filter-registry";
import type { FilterDefinition } from "@/lib/filter-lens/filters/filter-types";
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
    intensityDefault: f.intensityRange?.default ?? 50,
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

export function EffectStudioPage({
  kind,
  pageMode,
  title,
  subtitle,
  items,
  categories,
  initialSelectedId = null,
}: Props) {
  const { user, profile } = useAuth();
  const chargeUnlock = useServerFn(chargeFilterUnlock);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const sortedCategories = useMemo(() => {
    const preferred = ["Natural", "Portrait", "Cinematic", "Film"];
    const head = preferred.filter((c) => categories.includes(c));
    const rest = categories.filter((c) => !preferred.includes(c));
    return [...head, ...rest];
  }, [categories]);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "edit" | "result">("idle");
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);

  const isDark = true;
  const glassPanel = "border-white/10 bg-zinc-950/90 text-white";
  const glassChip = "border-white/15 bg-white/5 text-white/80";
  const glassChipActive = "border-amber-400/50 bg-amber-500/15 text-amber-200";
  const scrollHide =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

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
    if (q && kind !== "filter") {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, category, query, kind]);

  const onPick = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
    setFile(f);
    setSourceUrl(URL.createObjectURL(f));
    setPreviewUrl(null);
    setResultUrl(null);
    setPhase("edit");
  };

  useEffect(() => {
    if (!file || !selected || kind !== "filter" || phase === "result") return;
    if (!isUnlocked(selected.id, selected.isFree)) return;
    const gen = ++previewGen.current;
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const rgba = await fileToRGBAImage(file);
        const def = getFilterById(selected.id);
        if (!def) return;
        const scaled = downscale(rgba, 720);
        const result = renderPreview(def, scaled, intensity / 100);
        if (cancelled || gen !== previewGen.current) return;
        const url = await rgbaImageToObjectUrl(result);
        if (gen !== previewGen.current) return;
        setPreviewUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        console.error("[Motio2edit] preview failed", err);
      } finally {
        if (gen === previewGen.current) setBusy(false);
      }
    };
    const t = window.setTimeout(() => void run(), 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [file, selected, intensity, kind, phase, isUnlocked]);

  const onApply = async () => {
    if (!file || !selected) return;
    if (!isUnlocked(selected.id, selected.isFree)) {
      toast.message("Unlock this filter to apply");
      return;
    }
    setBusy(true);
    try {
      const rgba = await fileToRGBAImage(file);
      const def = getFilterById(selected.id);
      if (!def) throw new Error("Filter not found");
      const result = renderFullResolution(def, rgba, intensity / 100);
      const url = await rgbaImageToObjectUrl(result);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      setPhase("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const processedUrl = resultUrl || previewUrl;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-950 text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-amber-300/90">Motio2edit</p>
          <h1 className="truncate text-base font-bold">{title}</h1>
          <p className="truncate text-[11px] text-white/50">{subtitle}</p>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 pb-44 pt-3">
        {!sourceUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mx-auto mt-10 flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-white/15 bg-white/5 px-6 py-16"
          >
            <Upload className="h-8 w-8 text-amber-300" />
            <span className="text-sm font-semibold">Upload photo</span>
            <span className="text-[11px] text-white/50">Live previews use your image</span>
          </button>
        ) : (
          <div className="relative mx-auto w-full max-w-lg">
            {phase === "result" && sourceUrl && resultUrl ? (
              <CompareSlider before={sourceUrl} after={resultUrl} />
            ) : (
              <img
                src={processedUrl || sourceUrl}
                alt="Preview"
                className="mx-auto max-h-[min(50dvh,520px)] w-auto rounded-2xl object-contain"
              />
            )}
            {busy && (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              </div>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </main>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
          glassPanel,
        )}
      >
        <div className="mx-auto max-w-3xl space-y-2.5">
          {kind !== "filter" ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lenses…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                  <X className="h-4 w-4 opacity-60" />
                </button>
              ) : null}
            </div>
          ) : null}

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
            {sortedCategories.map((c) => (
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
                    if (phase === "result") setPhase("edit");
                  }}
                  className={cn(
                    "relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-2xl border p-2 transition",
                    active ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-white/5",
                  )}
                >
                  <span className="relative block h-14 w-14 overflow-hidden rounded-xl bg-zinc-800">
                    {sourceUrl ? (
                      <img src={sourceUrl} alt="" className="h-full w-full object-cover opacity-90" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[9px] text-white/40">—</span>
                    )}
                    {locked && (
                      <span className="absolute inset-0 grid place-items-center bg-black/50">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[10px] font-semibold">{item.name}</span>
                  {item.isFree ? (
                    <span className="text-[8px] text-emerald-400">Free</span>
                  ) : (
                    <span className="text-[8px] text-amber-300/90">Premium</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-2xl border border-white/15 px-3 py-2.5 text-xs font-semibold"
            >
              Photo
            </button>
            <button
              type="button"
              disabled={!file || !selected || busy || phase === "result"}
              onClick={() => void onApply()}
              className="flex-1 rounded-2xl bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40"
            >
              {busy ? "Applying…" : phase === "result" ? "Applied" : "Apply"}
            </button>
            {resultUrl && (
              <a
                href={resultUrl}
                download="motio2edit-filter.jpg"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15"
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
