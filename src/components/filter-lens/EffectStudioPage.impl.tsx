/**
 * Motio2edit Filters editor — production UI.
 * Uses filter-editor-core for Adjust pipeline + output-only watermark.
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
  Share2,
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
  DEFAULT_ADJ,
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
  const canUseAiPlus =
    isAdmin || ["lite", "plus", "pro", "studio", "business"].includes(planId);
  const canUsePremium =
    isAdmin || ["pro", "studio", "business"].includes(planId);

  const [category, setCategory] = useState<string | "all">("all");
  const [adj] = useState<AdjustValues>({ ...DEFAULT_ADJ });
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
  const inputRef = useRef<HTMLInputElement>(null);
  const previewGen = useRef(0);
  const sourceRgba = useRef<RGBAImage | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const isUnlocked = useCallback(
    (item: CatalogItem) => {
      if (isAdmin || item.isFree === true) return true;
      if (item.badge === "ai+") return canUseAiPlus;
      if (item.badge === "premium" || item.badge === "pro") return canUsePremium;
      return canUsePremium;
    },
    [isAdmin, canUseAiPlus, canUsePremium],
  );

  const filtered = useMemo(
    () => (category === "all" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );

  const revokeUrl = (url: string | null | undefined) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
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
      setComparing(false);
      if (!selectedId && items[0]) {
        setSelectedId(items[0].id);
        setIntensity(85);
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
        if (hasAdj(adj, "neutral", "neutral")) {
          out = { ...out, image: applyUserAdjustments(out.image, adj, null, null) };
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
  }, [file, selected, intensity, kind, phase, isUnlocked, adj]);

  const selectFilter = (item: CatalogItem) => {
    if (!isUnlocked(item)) {
      toast.message(
        item.badge === "ai+"
          ? "AI+ filter — upgrade to unlock"
          : "Premium filter — upgrade to unlock",
      );
      return;
    }
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
    setSelectedId(item.id);
    setIntensity(85);
  };

  const onApply = async () => {
    if (!file || !selected || !sourceRgba.current) return;
    if (!isUnlocked(selected)) {
      toast.message("Unlock this filter to apply");
      return;
    }
    setApplying(true);
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
      if (hasAdj(adj, "neutral", "neutral")) {
        out = { ...out, image: applyUserAdjustments(out.image, adj, null, null) };
      }
      const url = await rgbaImageToObjectUrl(out.image);
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

  const onDownload = () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm
      ? resultWmUrl || resultUrl || previewUrl
      : resultUrl || resultWmUrl || previewUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `motio2edit-${selected?.name ?? "filter"}.jpg`;
    a.click();
  };

  const onShare = async () => {
    const preferWm = freeUser || wmEnabled;
    const url = preferWm
      ? resultWmUrl || resultUrl || previewUrl
      : resultUrl || resultWmUrl || previewUrl;
    if (!url) return;
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const shareFile = new File(
        [blob],
        `motio2edit-${selected?.name ?? "filter"}.jpg`,
        { type: "image/jpeg" },
      );
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

  const processedUrl = resultUrl || previewUrl;
  const showWm = freeUser || wmEnabled;
  const displayResultUrl = showWm ? resultWmUrl || resultUrl : resultUrl || resultWmUrl;
  const hasPhoto = !!sourceUrl;

  if (!hasPhoto) {
    return (
      <div className="flex min-h-[70vh] flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Motio<span className="text-[#FF5A1F]">2</span>edit
            </p>
            <h1 className="truncate text-sm font-bold">{title || "Filters"}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-[#FF5A1F]/45 bg-[#FF5A1F]/10 px-6 py-16 transition hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/15"
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
            ) : (
              <ImagePlus className="h-8 w-8 text-[#FF5A1F]" />
            )}
            <span className="text-sm font-semibold">Drop image or tap to upload</span>
            <span className="text-xs text-muted-foreground">Looks unlock after you upload</span>
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full border border-border">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio<span className="text-[#FF5A1F]">2</span>edit
          </p>
          <h1 className="truncate text-sm font-bold">{title || "Filters"}</h1>
        </div>
        {phase === "edit" && (
          <button
            type="button"
            disabled={busy || applying || !selected}
            onClick={() => void onApply()}
            className="rounded-full bg-[#FF5A1F] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90 p-3">
        {phase === "result" && displayResultUrl ? (
          comparing && sourceUrl ? (
            <CompareSlider beforeSrc={sourceUrl} afterSrc={displayResultUrl} />
          ) : (
            <img src={displayResultUrl} alt="Result" className="max-h-full max-w-full object-contain" />
          )
        ) : processedUrl ? (
          <img src={processedUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
        ) : sourceUrl ? (
          <img src={sourceUrl} alt="Source" className="max-h-full max-w-full object-contain" />
        ) : null}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {phase === "result" ? (
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-card/80 p-4 sm:grid-cols-4">
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={() => setComparing((v) => !v)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
          >
            <Columns2 className="h-4 w-4" />
            {comparing ? "Hide compare" : "Compare"}
          </button>
          <button
            type="button"
            onClick={() => {
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
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
          >
            Edit again
          </button>
          {!freeUser && (
            <label className="col-span-2 flex items-center justify-center gap-2 text-xs sm:col-span-4">
              <input
                type="checkbox"
                checked={wmEnabled}
                onChange={(e) => setWmEnabled(e.target.checked)}
              />
              Motio2edit watermark
            </label>
          )}
        </div>
      ) : (
        <div className="shrink-0 space-y-2 border-t border-border bg-card/90 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                category === "all"
                  ? "border-transparent bg-[#FF5A1F] text-white"
                  : "border-border text-muted-foreground",
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
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  category === c
                    ? "border-transparent bg-[#FF5A1F] text-white"
                    : "border-border text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filtered.map((item) => {
              const locked = !isUnlocked(item);
              const active = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectFilter(item)}
                  className={cn(
                    "w-[78px] shrink-0 text-left",
                    locked && "opacity-70",
                  )}
                >
                  <div
                    className={cn(
                      "relative aspect-[1/1.05] overflow-hidden rounded-lg bg-muted",
                      active && "outline outline-2 outline-offset-1 outline-[#FF5A1F]",
                    )}
                  >
                    {item.thumbUrl ? (
                      <img
                        src={item.thumbUrl}
                        alt=""
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                    {active && (
                      <span className="absolute right-1 top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#FF5A1F] text-[11px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    {locked && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">
                        {item.badge === "ai+" ? "AI+" : "Premium"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[10px] font-medium">{item.name}</p>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-[11px] text-muted-foreground">Intensity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="h-8 flex-1 accent-[#FF5A1F]"
            />
            <span className="w-8 text-right text-xs tabular-nums">{intensity}</span>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onPick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
