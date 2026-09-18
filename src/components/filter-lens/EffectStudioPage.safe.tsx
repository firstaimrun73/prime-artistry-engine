/**
 * Motio2edit Filters — emergency safe UI (input-first).
 * Full engine path restored in EffectStudioPage.body when available.
 */
import { useCallback, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fileToRGBAImage,
  rgbaImageToObjectUrl,
} from "@/lib/filter-lens/client/image-bridge";
import {
  renderFullResolution,
} from "@/lib/filter-lens/filters/filter-engine";
import { getFilterById } from "@/lib/filter-lens/filters/filter-registry";
import type { CatalogItem } from "./filter-editor-core";
import { filterToCatalogItem } from "./filter-editor-core";

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

export function EffectStudioPage({ items, initialSelectedId = null }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || items[0]?.id || null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRgba = useRef<Awaited<ReturnType<typeof fileToRGBAImage>> | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const onPick = useCallback(async (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Please choose an image (JPG, PNG, WebP)");
      return;
    }
    setBusy(true);
    try {
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (resultUrl?.startsWith("blob:")) URL.revokeObjectURL(resultUrl);
      const rgba = await fileToRGBAImage(f);
      sourceRgba.current = rgba;
      const url = URL.createObjectURL(f);
      setFile(f);
      setSourceUrl(url);
      setPreviewUrl(null);
      setResultUrl(null);
      if (!selectedId && items[0]) setSelectedId(items[0].id);
      toast.success("Photo ready — pick a look");
    } catch {
      toast.error("Could not read that photo");
    } finally {
      setBusy(false);
    }
  }, [sourceUrl, previewUrl, resultUrl, selectedId, items]);

  const onApply = useCallback(async () => {
    if (!file || !selected || !sourceRgba.current) return;
    const def = getFilterById(selected.id);
    if (!def) {
      toast.error("Filter not found");
      return;
    }
    setApplying(true);
    setBusy(true);
    try {
      const out = renderFullResolution(sourceRgba.current, def.processingProfile, {
        intensity: 85,
        mode: "full",
        seed: 42,
      });
      if (out.cancelled) throw new Error("Cancelled");
      const url = await rgbaImageToObjectUrl(out.image);
      setResultUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
      toast.success("Filter applied");
    } catch {
      toast.error("Could not apply filter");
    } finally {
      setApplying(false);
      setBusy(false);
    }
  }, [file, selected]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Link to="/studio/image" className="grid h-9 w-9 place-items-center rounded-full" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Filters</p>
          <p className="text-[11px] text-muted-foreground">Motio2edit</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950">
        {!file ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border/60 bg-card/40 px-10 py-12"
            >
              <ImagePlus className="h-10 w-10 text-[#FF5A1F]" />
              <span className="text-sm font-semibold">Upload a photo</span>
              <span className="text-xs text-muted-foreground">JPG, PNG or WebP</span>
            </button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-3">
            <img
              src={resultUrl || previewUrl || sourceUrl || ""}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>

      {file && (
        <div className="shrink-0 border-t bg-card/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {items.slice(0, 24).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-[11px] font-semibold",
                  selectedId === item.id
                    ? "border-[#FF5A1F] bg-[#FF5A1F]/15 text-[#FF5A1F]"
                    : "border-border text-muted-foreground",
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={applying || busy || !selected}
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
    </div>
  );
}
