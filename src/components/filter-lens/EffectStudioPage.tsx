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
  RotateCcw,
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
  const freeUser = !isAdmin && (!profile || profile.plan === "free" || !profile.plan);
  const planId = (profile?.plan ?? "free") as string;
  // free → Common only; lite/plus → Common+AI+; pro/studio/business → all
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
    return false;
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
    if (
      last &&
      last.selectedId === snap.selectedId &&
      last.intensity === snap.intensity &&
      last.highlightColorId === snap.highlightColorId &&
      last.shadowColorId === snap.shadowColorId &&
      JSON.stringify(last.adj) === JSON.stringify(snap.adj)
    ) {
      return;
    }
    stack.push(snap);
    if (stack.length > 40) stack.shift();
    historyRef.current = stack;
    historyIdxRef.current = stack.length - 1;
    setHistoryTick((t) => t + 1);
  }, []);
  const pushHistoryDebounced = useCallback((snap: EditSnapshot) => {
    if (histDebounceRef.current) window.clearTimeout(histDebounceRef.current);
    histDebounceRef.current = window.setTimeout(() => {
      pushHistory(snap);
      histDebounceRef.current = null;
    }, 280);
  }, [pushHistory]);
  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current >= 0 && historyIdxRef.current < historyRef.current.length - 1;
  void historyTick;
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
      const initIntensity = items.find((i) => i.id === initId)?.intensityDefault ?? 85;
      if (!selectedId && items[0]) { setSelectedId(items[0].id); setIntensity(items[0].intensityDefault); }
      historyRef.current = [{
        selectedId: initId,
        intensity: initIntensity,
        adj: { ...DEFAULT_ADJ },
        highlightColorId: "neutral",
        shadowColorId: "neutral",
      }];
      historyIdxRef.current = 0;
      setHistoryTick((t) => t + 1);
      toast.success("Photo ready — pick a look");
    } catch (err) { console.error(err); toast.error("Could not read that photo"); }
    finally { setBusy(false); }
  };
