import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Aperture,
  Check,
  Columns2,
  Download,
  ImagePlus,
  Loader2,
  Lock,
  RotateCcw,
  SunMedium,
  Contrast,
  Palette,
  CircleDot,
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
  cloneImage,
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

type AdjustValues = {
  light: number;
  shadow: number;
  color: number;
  hue: number;
  vignette: number;
};

type AdjustKey = keyof AdjustValues;

const DEFAULT_ADJ: AdjustValues = {
  light: 0,
  shadow: 0,
  color: 0,
  hue: 0,
  vignette: 0,
};

const ADJUST_META: {
  key: AdjustKey;
  label: string;
  icon: typeof SunMedium;
  min: number;
  max: number;
}[] = [
  { key: "light", label: "Light", icon: SunMedium, min: -50, max: 50 },
  { key: "shadow", label: "Shadow", icon: Contrast, min: -50, max: 50 },
  { key: "color", label: "Color", icon: Palette, min: -50, max: 50 },
  { key: "hue", label: "Hue", icon: Aperture, min: -180, max: 180 },
  { key: "vignette", label: "Vignette", icon: CircleDot, min: 0, max: 100 },
];

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function applyUserAdjustments(image: RGBAImage, adj: AdjustValues): RGBAImage {
  const working = cloneImage(image);
  const data = working.data;
  const { light, shadow, color, hue, vignette } = adj;

  if (light !== 0 || shadow !== 0 || color !== 0 || hue !== 0) {
    const hueRad = (hue * Math.PI) / 180;
    const cosH = Math.cos(hueRad);
    const sinH = Math.sin(hueRad);
    const satMul = 1 + color / 50;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (light !== 0) {
        const exp = Math.pow(2, light / 60);
        r *= exp; g *= exp; b *= exp;
      }

      if (shadow !== 0) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const w = 1 - Math.min(1, l / 128);
        const lift = shadow * 0.55 * w;
        r += lift; g += lift; b += lift;
      }

      if (hue !== 0) {
        const yr = 0.299 * r + 0.587 * g + 0.114 * b;
        const iR = r - yr;
        const iB = b - yr;
        const iG = g - yr;
        const hr = iR * cosH - iB * sinH;
        const hb = iR * sinH + iB * cosH;
        r = yr + hr;
        g = yr + (iG * cosH - (iR - iB) * 0.3 * sinH);
        b = yr + hb;
      }

      if (color !== 0) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * satMul;
        g = l + (g - l) * satMul;
        b = l + (b - l) * satMul;
      }

      data[i] = clamp8(r);
      data[i + 1] = clamp8(g);
      data[i + 2] = clamp8(b);
    }
  }

  if (vignette > 0) {
    const cx = working.width / 2;
    const cy = working.height / 2;
    const maxD = Math.hypot(cx, cy);
    const strength = vignette / 100;
    for (let y = 0; y < working.height; y++) {
      for (let x = 0; x < working.width; x++) {
        const d = Math.hypot(x - cx, y - cy) / maxD;
        const v = 1 - strength * Math.pow(d, 1.6);
        const i = (y * working.width + x) * 4;
        data[i] = clamp8(data[i] * v);
        data[i + 1] = clamp8(data[i + 1] * v);
        data[i + 2] = clamp8(data[i + 2] * v);
      }
    }
  }

  return working;
}

function hasAdj(adj: AdjustValues): boolean {
  return adj.light !== 0 || adj.shadow !== 0 || adj.color !== 0 || adj.hue !== 0 || adj.vignette !== 0;
}

function OrangeSlider({
  value, min, max, onChange, ariaLabel,
}: {
  value: number; min: number; max: number;
  onChange: (v: number) => void; ariaLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex h-8 flex-1 items-center">
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-[#E8E0D8]" />
      <div className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[#FF5A1F]" style={{ width: `${pct}%` }} />
      <input
        type="range" min={min} max={max} step={1} value={value} aria-label={ariaLabel}
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
  kind, pageMode: _pageMode, title, subtitle: _subtitle, items, categories, initialSelectedId = null,
}: Props) {
  const { user } = useAuth();
  const chargeUnlock = useServerFn(chargeFilterUnlock);

  const [category, setCategory] = useState<string | "all">("all");
  const [editorTab, setEditorTab] = useState<"filter" | "adjust">("filter");
  const [adj, setAdj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
  const [adjKey, setAdjKey] = useState<AdjustKey>("light");

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

  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  const isUnlocked = useCallback(
    (id: string, isFree: boolean) => (isFree ? true : unlockedIds.has(id)),
    [unlockedIds],
  );

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

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
      setResultUrl((prev) => { revokeUrl(prev); return null; });
    }
  };

  const onPick = async (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image (JPG, PNG, WebP)");
      return;
    }
    setBusy(true);
    try {
      revokeUrl(sourceUrl); revokeUrl(previewUrl); revokeUrl(resultUrl); clearThumbs();
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      thumbRgba.current = downscale(rgba, 160);
      const url = URL.createObjectURL(f);
      setFile(f); setSourceUrl(url); setPreviewUrl(null); setResultUrl(null);
      setPhase("edit"); setEditorTab("filter"); setAdj({ ...DEFAULT_ADJ });
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
                intensity: item.intensityDefault, mode: "preview", previewMaxDimension: 160, seed: 42,
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
    return () => { cancelled = true; };
  }, [file, items, kind]);

  useEffect(() => {
    if (!file || !selected || kind !== "filter" || phase === "result") return;
    if (!isUnlocked(selected.id, selected.isFree) || !sourceRgba.current) return;
    const gen = ++previewGen.current;
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const def = getFilterById(selected.id);
        if (!def) return;
        const scaled = downscale(sourceRgba.current!, 720);
        let out = applyProcessingProfile(scaled, def.processingProfile, {
          intensity, mode: "preview", previewMaxDimension: 720, seed: 42,
        });
        if (cancelled || gen !== previewGen.current || out.cancelled) return;
        if (hasAdj(adj)) out = { ...out, image: applyUserAdjustments(out.image, adj) };
        const url = await rgbaImageToObjectUrl(out.image);
        if (gen !== previewGen.current) { revokeUrl(url); return; }
        setPreviewUrl((prev) => { revokeUrl(prev); return url; });
      } catch (err) {
        console.error("[Motio2edit] preview failed", err);
      } finally {
        if (gen === previewGen.current) setBusy(false);
      }
    };
    const t = window.setTimeout(() => void run(), 60);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [file, selected, intensity, kind, phase, isUnlocked, adj]);

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
      let out = renderFullResolution(sourceRgba.current, def.processingProfile, {
        intensity, mode: "full", seed: 42,
      });
      if (out.cancelled) throw new Error("Cancelled");
      if (hasAdj(adj)) out = { ...out, image: applyUserAdjustments(out.image, adj) };
      const url = await rgbaImageToObjectUrl(out.image);
      setResultUrl((prev) => { revokeUrl(prev); return url; });
      setPhase("result");
      toast.success("Filter applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  };

  const onUnlock = async (item: CatalogItem) => {
    if (!user) { toast.message("Sign in to unlock premium filters"); return; }
    try {
      await chargeUnlock({ data: { kind: "filter", itemId: item.id } });
      setUnlockedIds((s) => new Set(s).add(item.id));
      toast.success(`${item.name} unlocked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    }
  };

  const onRestart = () => {
    setPhase("edit");
    setResultUrl((prev) => { revokeUrl(prev); return null; });
    setEditorTab("filter");
    setComparing(false);
  };

  const onDownload = () => {
    const url = resultUrl || previewUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `motio2edit-${selected?.name ?? "filter"}.jpg`;
    a.click();
  };

  const processedUrl = resultUrl || previewUrl;
  const hasPhoto = !!sourceUrl;
  const adjMeta = ADJUST_META.find((m) => m.key === adjKey)!;

  if (!hasPhoto) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#FFFBF7] text-[#161412]">
        <header className="flex items-center gap-3 border-b border-[#E8E0D8] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8] bg-white" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">Motio2edit</p>
            <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="mb-6 text-center">
            <p className="text-2xl font-bold tracking-tight text-[#161412]">100+ AI Filters</p>
            <p className="mt-1 text-sm text-[#6F6862]">Live preview on your photo</p>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex w-full flex-col items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/45 bg-[#FFF1E6] px-6 py-16 transition hover:border-[#FF5A1F] hover:bg-[#FFE6DA]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FF5A1F]/15 text-[#FF5A1F]">
              {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
            </span>
            <span className="text-base font-semibold">Drop image or tap to upload</span>
            <span className="max-w-xs text-center text-sm text-[#6F6862]">Upload a photo to explore looks with live preview</span>
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#FFFBF7] text-[#161412]">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E8E0D8] bg-white px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-[#E8E0D8]" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#FF5A1F] uppercase">Motio2edit</p>
          <h1 className="truncate text-base font-bold">{title}</h1>
        </div>
        {phase !== "result" ? (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E8E0D8] bg-white px-3 text-xs font-semibold">
            <ImagePlus className="h-3.5 w-3.5" /> Photo
          </button>
        ) : null}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files?.[0] ?? null)} />
      </header>

      <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2">
        {phase === "result" && sourceUrl && resultUrl ? (
          comparing ? (
            <img src={sourceUrl} alt="Original" className="max-h-full w-auto max-w-full rounded-xl object-contain" draggable={false} />
          ) : (
            <img src={resultUrl} alt="Result" className="max-h-full w-auto max-w-full rounded-xl object-contain" draggable={false} />
          )
        ) : comparing ? (
          <img src={sourceUrl!} alt="Original" className="max-h-full w-auto max-w-full object-contain" draggable={false} />
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
        <div className="shrink-0 border-t border-[#E8E0D8] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md items-center justify-between gap-2">
            <button type="button" onClick={onRestart} className="flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-[#161412]">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#E8E0D8] bg-[#FFFBF7]"><RotateCcw className="h-5 w-5" /></span>
              Restart
            </button>
            <button type="button" onPointerDown={() => setComparing(true)} onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)} onPointerCancel={() => setComparing(false)}
              className="flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-[#161412]">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#E8E0D8] bg-[#FFFBF7]"><Columns2 className="h-5 w-5" /></span>
              Compare
            </button>
            <button type="button" onClick={onDownload} className="flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-[#161412]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FF5A1F]/12 text-[#FF5A1F] ring-1 ring-[#FF5A1F]/25"><Download className="h-5 w-5" /></span>
              Download
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-center gap-10 border-t border-[#E8E0D8] bg-white">
            <button type="button" onClick={() => setEditorTab("filter")}
              className={`relative px-1 py-2.5 text-xs font-bold tracking-[0.12em] uppercase ${editorTab === "filter" ? "text-[#FF5A1F]" : "text-[#6F6862]"}`}>
              Filter
              {editorTab === "filter" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#FF5A1F]" /> : null}
            </button>
            <button type="button" onClick={() => setEditorTab("adjust")}
              className={`relative px-1 py-2.5 text-xs font-bold tracking-[0.12em] uppercase ${editorTab === "adjust" ? "text-[#FF5A1F]" : "text-[#6F6862]"}`}>
              Adjust
              {editorTab === "adjust" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#FF5A1F]" /> : null}
            </button>
          </div>

          <div className="shrink-0 border-t border-[#E8E0D8] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {editorTab === "filter" ? (
              <div className="space-y-2 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold tracking-tight text-[#161412]">100+ AI Filters</p>
                  <span className="text-[10px] text-[#A39C96]">{thumbsBusy ? "Updating previews…" : "Live preview on your photo"}</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                  <button type="button" onClick={() => setCategory("all")}
                    className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", category === "all" ? "bg-[#FF5A1F] text-white" : "bg-[#F3EEE8] text-[#6F6862]")}>
                    All
                  </button>
                  {sortedCategories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", category === c ? "bg-[#FF5A1F] text-white" : "bg-[#F3EEE8] text-[#6F6862]")}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {filtered.map((item) => {
                    const unlocked = isUnlocked(item.id, item.isFree);
                    const active = selectedId === item.id;
                    const thumb = thumbMap[item.id];
                    return (
                      <button key={item.id} type="button"
                        onClick={() => {
                          if (!unlocked) { void onUnlock(item); return; }
                          setSelectedId(item.id); setIntensity(item.intensityDefault); bumpToEdit();
                        }}
                        className={cn("relative w-[4.6rem] shrink-0 overflow-hidden rounded-xl border-2 bg-[#F3EEE8]", active ? "border-[#FF5A1F]" : "border-transparent")}>
                        <div className="relative aspect-square w-full overflow-hidden bg-[#E8E0D8]">
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : (
                            <div className="grid h-full place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[#A39C96]" /></div>
                          )}
                          {!unlocked ? <span className="absolute inset-0 grid place-items-center bg-black/35"><Lock className="h-3.5 w-3.5 text-white" /></span> : null}
                          {active ? <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#FF5A1F] text-white"><Check className="h-2.5 w-2.5" /></span> : null}
                        </div>
                        <span className="block truncate bg-[#141210] px-1 py-0.5 text-center text-[9px] font-semibold tracking-wide text-[#FFFBF7] uppercase">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
                {selected ? (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="w-16 shrink-0 text-xs font-medium text-[#6F6862]">Intensity</span>
                    <OrangeSlider value={intensity} min={0} max={100} ariaLabel="Filter intensity"
                      onChange={(v) => { setIntensity(v); bumpToEdit(); }} />
                    <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{intensity}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold tracking-tight text-[#161412]">Adjust</p>
                  <button type="button" className="text-[11px] font-semibold text-[#FF5A1F]"
                    onClick={() => { setAdj({ ...DEFAULT_ADJ }); bumpToEdit(); }}>Reset</button>
                </div>
                <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
                  {ADJUST_META.map((m) => {
                    const Icon = m.icon;
                    const active = adjKey === m.key;
                    return (
                      <button key={m.key} type="button" onClick={() => setAdjKey(m.key)}
                        className="flex min-w-[3.5rem] flex-col items-center gap-1">
                        <span className={cn("grid h-11 w-11 place-items-center rounded-2xl border",
                          active ? "border-[#FF5A1F] bg-[#FF5A1F]/10 text-[#FF5A1F]" : "border-[#E8E0D8] bg-[#FFFBF7] text-[#6F6862]")}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className={cn("text-[10px] font-semibold", active ? "text-[#FF5A1F]" : "text-[#6F6862]")}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl border border-[#E8E0D8] bg-[#FFFBF7]/90 px-3 py-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#161412]">{adjMeta.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-[#161412]">{adj[adjKey]}</span>
                  </div>
                  <OrangeSlider value={adj[adjKey]} min={adjMeta.min} max={adjMeta.max} ariaLabel={`${adjMeta.label} adjustment`}
                    onChange={(v) => { setAdj((prev) => ({ ...prev, [adjKey]: v })); bumpToEdit(); }} />
                </div>
              </div>
            )}

            <div className="px-3 pb-1 pt-1">
              <button type="button"
                disabled={!selected || busy || (selected ? !isUnlocked(selected.id, selected.isFree) : true)}
                onClick={() => void onApply()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white shadow-md shadow-[#FF5A1F]/20 disabled:opacity-40">
                {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Applying…</>) : "Apply filter"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
