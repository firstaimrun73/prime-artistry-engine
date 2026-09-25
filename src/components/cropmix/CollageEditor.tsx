/**
 * Cropmix Collage — 10 styles; grip reorder; per-cell Fit/Fill + pan.
 */
import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Check, Loader2, SlidersHorizontal, X, ArrowLeft, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { COLLAG_STYLES, getStyleById } from "@/lib/cropmix/styles";
import { renderCollageClient } from "@/lib/cropmix/collage-render";
import { drawCropmixWatermark } from "@/lib/cropmix/watermark";
import {
  CROPMIX_AI_PLUS_CREDITS, CROPMIX_VOLT,
  type CollageCanvasRatio, type CollageCell, type CollageCustomize,
  type CollageStyleId, type PhotoSlot,
} from "@/lib/cropmix/types";

type Props = {
  onResult: (dataUrl: string, width: number, height: number, creditsCharged: number) => void;
  onCancel: () => void;
};

const RATIOS: { id: CollageCanvasRatio; label: string }[] = [
  { id: "1:1", label: "1:1" }, { id: "4:5", label: "4:5" }, { id: "3:4", label: "3:4" },
  { id: "4:3", label: "4:3" }, { id: "9:16", label: "9:16" }, { id: "16:9", label: "16:9" },
];

function uid() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}
function defaultCell(photoId: string): CollageCell {
  return { photoId, fit: "fill", offsetX: 0, offsetY: 0, zoom: 1 };
}
async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export function CollageEditor({ onResult, onCancel }: Props) {
  const { profile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const credits = profile?.credits ?? 0;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [cells, setCells] = useState<CollageCell[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<CollageStyleId>("normal-grid");
  const [ratio, setRatio] = useState<CollageCanvasRatio>("1:1");
  const [customize, setCustomize] = useState<CollageCustomize>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);
  const dragFrom = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const panRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const style = getStyleById(styleId);
  const selectedCell = cells.find((c) => c.photoId === selectedPhotoId) ?? null;

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current = [];
    };
  }, []);

  const syncCells = (nextPhotos: PhotoSlot[], prev: CollageCell[]) => {
    const byId = new Map(prev.map((c) => [c.photoId, c]));
    return nextPhotos.map((p) => byId.get(p.id) ?? defaultCell(p.id));
  };

  useEffect(() => {
    if (!photos.length || !style || !cells.length) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { dataUrl } = await renderCollageClient({
          styleId, photos, cells,
          customize: { ...style.defaults, ...customize },
          ratio, maxSide: 640,
        });
        if (!cancelled) setPreviewUrl(dataUrl);
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    }, 160);
    return () => { cancelled = true; clearTimeout(t); };
  }, [photos, cells, styleId, ratio, customize, style]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 10 - photos.length);
    const nextSlots: PhotoSlot[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => res({ w: 1, h: 1 });
        img.src = url;
      });
      nextSlots.push({ id: uid(), previewUrl: url, sourceUrl: url, width: dims.w, height: dims.h });
    }
    setPhotos((prev) => {
      const merged = [...prev, ...nextSlots].slice(0, 10);
      setCells((c) => syncCells(merged, c));
      if (!selectedPhotoId && merged[0]) setSelectedPhotoId(merged[0].id);
      return merged;
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const merged = prev.filter((x) => x.id !== id);
      setCells((c) => syncCells(merged, c));
      if (selectedPhotoId === id) setSelectedPhotoId(merged[0]?.id ?? null);
      return merged;
    });
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setPhotos((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setCells((c) => syncCells(next, c));
      return next;
    });
  };

  const updateSelectedCell = (patch: Partial<CollageCell>) => {
    if (!selectedPhotoId) return;
    setCells((prev) =>
      prev.map((c) => (c.photoId === selectedPhotoId ? { ...c, ...patch } : c)),
    );
  };

  const handleExport = async () => {
    if (!photos.length || !style) { toast.error("Add at least one photo."); return; }
    if (photos.length < style.cellCount.min) {
      toast.error(`This style needs at least ${style.cellCount.min} photos.`);
      return;
    }
    if (photos.length > style.cellCount.max) {
      toast.error(`This style supports at most ${style.cellCount.max} photos.`);
      return;
    }
    const isAiPlus = style.tier === "ai_plus";
    if (isAiPlus && !isAdmin && credits < CROPMIX_AI_PLUS_CREDITS) {
      toast.error(`AI+ styles cost ${CROPMIX_AI_PLUS_CREDITS} credits.`);
      return;
    }
    setBusy(true);
    try {
      if (isAiPlus) {
        const { generateCropmixCollage } = await import("@/lib/cropmix/cropmix.functions");
        try {
          const photoUrls = await Promise.all(photos.map((p) => toDataUrl(p.sourceUrl)));
          const result = await generateCropmixCollage({
            data: { styleId, photoUrls, ratio, customize: { ...style.defaults, ...customize } },
          });
          if (!result?.dataUrl) throw new Error(result?.error || "Generation failed.");
          onResult(result.dataUrl, result.width, result.height, result.creditsCharged ?? CROPMIX_AI_PLUS_CREDITS);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "AI+ collage failed. No credits charged.");
        }
      } else {
        const { dataUrl, width, height } = await renderCollageClient({
          styleId, photos, cells,
          customize: { ...style.defaults, ...customize },
          ratio, maxSide: 2048,
        });
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => rej(new Error("decode failed"));
          i.src = dataUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        drawCropmixWatermark(ctx, width, height);
        onResult(canvas.toDataURL("image/jpeg", 0.92), width, height, 0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export collage.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full border border-border" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm font-semibold">Collage</span>
        <button type="button" onClick={() => setDrawerOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full border border-border" aria-label="Customize">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button type="button" disabled={busy || !photos.length} onClick={handleExport}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
          style={{ backgroundColor: CROPMIX_VOLT }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {style?.tier === "ai_plus" ? `${CROPMIX_AI_PLUS_CREDITS} cr` : "Export"}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden bg-black/90 p-3"
        onPointerDown={(e) => {
          if (!selectedCell) return;
          panRef.current = { startX: e.clientX, startY: e.clientY, ox: selectedCell.offsetX, oy: selectedCell.offsetY };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!panRef.current || !selectedCell) return;
          const dx = (e.clientX - panRef.current.startX) / 200;
          const dy = (e.clientY - panRef.current.startY) / 200;
          updateSelectedCell({
            offsetX: Math.max(-0.5, Math.min(0.5, panRef.current.ox + dx)),
            offsetY: Math.max(-0.5, Math.min(0.5, panRef.current.oy + dy)),
          });
        }}
        onPointerUp={() => { panRef.current = null; }}
        onPointerCancel={() => { panRef.current = null; }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Collage preview" className="max-h-full max-w-full object-contain" draggable={false} />
        ) : (
          <p className="text-sm text-muted-foreground">{photos.length ? "Building preview…" : "Add photos to begin"}</p>
        )}
      </div>

      {selectedCell && (
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
          <span className="text-[11px] font-medium text-muted-foreground">Cell</span>
          {(["fit", "fill"] as const).map((f) => (
            <button key={f} type="button" onClick={() => updateSelectedCell({ fit: f })}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium",
                selectedCell.fit === f ? "border-transparent text-black" : "border-border text-muted-foreground")}
              style={selectedCell.fit === f ? { backgroundColor: CROPMIX_VOLT } : undefined}>
              {f === "fit" ? "Fit" : "Fill"}
            </button>
          ))}
          <button type="button" onClick={() => updateSelectedCell({ offsetX: 0, offsetY: 0, zoom: 1 })}
            className="ml-auto rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Reset cell
          </button>
        </div>
      )}

      <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-card/80 px-3 py-2">
        {photos.map((p, idx) => (
          <div key={p.id} draggable
            onDragStart={() => { dragFrom.current = idx; }}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
            onDrop={() => {
              if (dragFrom.current != null) reorder(dragFrom.current, idx);
              dragFrom.current = null; setDragOverIdx(null);
            }}
            onDragEnd={() => { dragFrom.current = null; setDragOverIdx(null); }}
            className={cn(
              "relative flex h-14 w-[4.5rem] shrink-0 items-stretch overflow-hidden rounded-lg border",
              selectedPhotoId === p.id ? "ring-1 ring-[#C6FF3D]" : "border-border",
              dragOverIdx === idx && "opacity-70",
            )}>
            <button type="button" className="grid w-5 place-items-center bg-muted/80 text-muted-foreground"
              aria-label={`Reorder photo ${idx + 1}`} title="Drag to reorder"
              onClick={(e) => { e.stopPropagation(); if (idx > 0) reorder(idx, idx - 1); }}>
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="relative min-w-0 flex-1" onClick={() => setSelectedPhotoId(p.id)}>
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
            <button type="button" onClick={() => removePhoto(p.id)}
              className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
              aria-label="Remove photo">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < 10 && (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground"
            aria-label="Add photos">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border px-3 py-2">
        {COLLAG_STYLES.map((s) => {
          const disabled = photos.length > 0 && (photos.length < s.cellCount.min || photos.length > s.cellCount.max);
          const active = styleId === s.id;
          return (
            <button key={s.id} type="button" disabled={disabled} onClick={() => setStyleId(s.id)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40",
                active ? "border-transparent text-black" : "border-border text-muted-foreground")}
              style={active ? { backgroundColor: CROPMIX_VOLT } : undefined} title={s.description}>
              {s.name}{s.tier === "ai_plus" ? " · AI+" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border px-3 py-2">
        {RATIOS.map((r) => (
          <button key={r.id} type="button" onClick={() => setRatio(r.id)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
              ratio === r.id ? "border-transparent text-black" : "border-border text-muted-foreground")}
            style={ratio === r.id ? { backgroundColor: CROPMIX_VOLT } : undefined}>
            {r.label}
          </button>
        ))}
      </div>

      {drawerOpen && style && (
        <div className="shrink-0 space-y-3 border-t border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customize</span>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          {style.capabilities.gutter && (
            <label className="flex items-center justify-between gap-3 text-sm">Gutter
              <input type="range" min={0} max={40} value={customize.gutter ?? style.defaults.gutter}
                onChange={(e) => setCustomize((c) => ({ ...c, gutter: Number(e.target.value) }))} />
            </label>
          )}
          {style.capabilities.border && (
            <label className="flex items-center justify-between gap-3 text-sm">Border
              <input type="range" min={0} max={12} value={customize.border ?? style.defaults.border}
                onChange={(e) => setCustomize((c) => ({ ...c, border: Number(e.target.value) }))} />
            </label>
          )}
          {style.capabilities.cornerRadius && (
            <label className="flex items-center justify-between gap-3 text-sm">Radius
              <input type="range" min={0} max={32} value={customize.cornerRadius ?? style.defaults.cornerRadius}
                onChange={(e) => setCustomize((c) => ({ ...c, cornerRadius: Number(e.target.value) }))} />
            </label>
          )}
          {style.capabilities.background && (
            <label className="flex items-center justify-between gap-3 text-sm">Background
              <input type="color" value={customize.background ?? style.defaults.background}
                onChange={(e) => setCustomize((c) => ({ ...c, background: e.target.value }))} />
            </label>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = "";
        }} />
    </div>
  );
}
