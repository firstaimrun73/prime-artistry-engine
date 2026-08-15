import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

export type CropAspect = "free" | "1:1" | "4:5" | "3:4" | "16:9" | "9:16";

const ASPECTS: { id: CropAspect; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

type Props = {
  /** Source image as data URL or https URL */
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  /** Called with a new JPEG data URL of the cropped region (does not mutate original until parent applies) */
  onApply: (croppedDataUrl: string) => void;
};

type Rect = { x: number; y: number; w: number; h: number };

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Client-side crop modal — pure UI + canvas crop.
 * Does not touch generation backends. Parent decides when to replace the upload.
 */
export function ImageCropModal({ imageSrc, open, onClose, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<CropAspect>("free");
  const [crop, setCrop] = useState<Rect>(FULL);
  const [dragging, setDragging] = useState<null | "move" | "se">(null);
  const dragStart = useRef<{ mx: number; my: number; crop: Rect } | null>(null);
  const [ready, setReady] = useState(false);

  /** Reset selection: full image for free; centered max fit for fixed ratios. */
  const resetCrop = useCallback((ratio: number | null) => {
    if (ratio == null) {
      setCrop(FULL);
      return;
    }
    let w = 0.9;
    let h = w / ratio;
    if (h > 0.9) {
      h = 0.9;
      w = h * ratio;
    }
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  }, []);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setAspect("free");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
      setCrop(FULL);
    };
    img.onerror = () => setReady(false);
    img.src = imageSrc;
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open || !ready || !imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxW = Math.min(560, typeof window !== "undefined" ? window.innerWidth - 48 : 560);
    const scale = Math.min(maxW / img.naturalWidth, 420 / img.naturalHeight, 1);
    const dw = Math.max(1, Math.round(img.naturalWidth * scale));
    const dh = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = dw;
    canvas.height = dh;

    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(img, 0, 0, dw, dh);

    const cx = crop.x * dw;
    const cy = crop.y * dh;
    const cw = crop.w * dw;
    const ch = crop.h * dh;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, dw, cy);
    ctx.fillRect(0, cy + ch, dw, dh - cy - ch);
    ctx.fillRect(0, cy, cx, ch);
    ctx.fillRect(cx + cw, cy, dw - cx - cw, ch);

    ctx.strokeStyle = "hsl(24 95% 53%)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.fillStyle = "hsl(24 95% 53%)";
    ctx.fillRect(cx + cw - 10, cy + ch - 10, 18, 18);
  }, [open, ready, crop]);

  const pointerPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / Math.max(r.width, 1),
      y: (e.clientY - r.top) / Math.max(r.height, 1),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = pointerPos(e);
    const seX = crop.x + crop.w;
    const seY = crop.y + crop.h;
    const nearSe = Math.abs(p.x - seX) < 0.08 && Math.abs(p.y - seY) < 0.08;
    setDragging(nearSe ? "se" : "move");
    dragStart.current = { mx: p.x, my: p.y, crop: { ...crop } };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const p = pointerPos(e);
    const dx = p.x - dragStart.current.mx;
    const dy = p.y - dragStart.current.my;
    const base = dragStart.current.crop;
    const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

    if (dragging === "move") {
      const nx = Math.min(Math.max(0, base.x + dx), 1 - base.w);
      const ny = Math.min(Math.max(0, base.y + dy), 1 - base.h);
      setCrop({ ...base, x: nx, y: ny });
    } else {
      let nw = Math.min(Math.max(0.08, base.w + dx), 1 - base.x);
      let nh = Math.min(Math.max(0.08, base.h + dy), 1 - base.y);
      if (ratio != null) {
        nh = nw / ratio;
        if (nh > 1 - base.y) {
          nh = 1 - base.y;
          nw = nh * ratio;
        }
        if (nw > 1 - base.x) {
          nw = 1 - base.x;
          nh = nw / ratio;
        }
      }
      setCrop({ ...base, w: nw, h: Math.min(nh, 1 - base.y) });
    }
  };

  const onPointerUp = () => {
    setDragging(null);
    dragStart.current = null;
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img) return;
    const sx = Math.round(crop.x * img.naturalWidth);
    const sy = Math.round(crop.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
    const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));
    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    // High-quality JPEG for the working image (generation uploads this data URL).
    onApply(out.toDataURL("image/jpeg", 0.95));
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-background/90 p-0 backdrop-blur-md sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[95vh] w-full max-w-xl flex-col overflow-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Crop image</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setAspect(a.id);
                resetCrop(a.ratio);
              }}
              className={
                "min-h-[36px] rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors " +
                (aspect === a.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40")
              }
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-secondary">
          {ready ? (
            <canvas
              ref={canvasRef}
              className="max-h-[50vh] max-w-full touch-none cursor-crosshair"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center text-sm text-muted-foreground">
              Loading image…
            </div>
          )}
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Drag to move · corner handle to resize · Apply updates the working image for generation. Cancel leaves the original unchanged.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            onClick={() => resetCrop(ASPECTS.find((a) => a.id === aspect)?.ratio ?? null)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="min-h-[44px]" onClick={apply} disabled={!ready}>
            Apply crop
          </Button>
        </div>
      </div>
    </div>
  );
}
