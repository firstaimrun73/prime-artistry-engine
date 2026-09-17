/**
 * Motio2edit Filters editor — emergency restore (working UI).
 * Upload → select filter → preview (local NPR) → Apply (AI+ styles hit Workers AI once).
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
  const canUseAiPlus = isAdmin || ["lite", "plus", "pro", "studio", "business"].includes(planId);
  const canUsePremium = isAdmin || ["pro", "studio", "business"].includes(planId);

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
      if (!selectedId && items[0]) setSelectedId(items[0].id);
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

  const selectFilter = (item: CatalogItem) => {
    if (!isUnlocked(item)) {
      toast.message(item.badge === "ai+" ? "AI+ filter — upgrade to unlock" : "Premium filter — upgrade to unlock");
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur">
        <Link to="/" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold tracking-tight">{title || "Filters"}</h1>
        {busy && <Loader2 className="ml-auto h-4 w-4 animate-spin text-[#FF5A1F]" />}
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
                    setResultUrl((p) => {
                      revokeUrl(p);
                      return null;
                    });
                    setResultWmUrl((p) => {
                      revokeUrl(p);
                      return null;
                    });
                  }}
                  className="w-full text-center text-xs text-muted-foreground underline"
                >
                  Edit again
                </button>
              </div>
            ) : (
              <div className="space-y-3 border-t border-border/60 p-3">
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
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="flex-1 accent-[#FF5A1F]"
                  />
                  <span className="w-8 text-right text-xs font-bold">{intensity}</span>
                </div>

                <button
                  type="button"
                  disabled={applying || busy || (selected ? !isUnlocked(selected) : true)}
                  onClick={() => void onApply()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {applying || busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                    </>
                  ) : (
                    "Apply filter"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
