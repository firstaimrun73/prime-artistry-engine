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
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onApply: (croppedDataUrl: string) => void;
};

type Rect = { x: number; y: number; w: number; h: number };

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };

type Handle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

const MIN_FRAC = 0.05;

/**
 * Professional client-side crop.
 * - Default crop = full outer image bounds
 * - Drag outer handles inward (4 corners + 4 edges)
 * - Outside area dimmed; inside is clear (no inner gradient)
 * - Apply produces real pixel crop at natural resolution
 */
export function ImageCropModal({ imageSrc, open, onClose, onApply }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<CropAspect>("free");
  const [crop, setCrop] = useState<Rect>(FULL);
  const [dragging, setDragging] = useState<Handle | null>(null);
  const dragStart = useRef<{ mx: number; my: number; crop: Rect } | null>(null);
  const [ready, setReady] = useState(false);
  const [disp, setDisp] = useState({ w: 0, h: 0 });

  const resetCrop = useCallback((ratio: number | null) => {
    if (ratio == null) {
      setCrop(FULL);
      return;
    }
    let w = 1;
    let h = w / ratio;
    if (h > 1) {
      h = 1;
      w = h * ratio;
    }
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  }, []);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setAspect("free");
    const img = new Image();
    if (imageSrc.startsWith("http")) img.crossOrigin = "anonymous";
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

    const maxW = Math.min(640, typeof window !== "undefined" ? window.innerWidth - 40 : 640);
    const maxH = typeof window !== "undefined" ? Math.min(520, window.innerHeight * 0.55) : 420;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const dw = Math.max(1, Math.round(img.naturalWidth * scale));
    const dh = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = dw;
    canvas.height = dh;
    setDisp({ w: dw, h: dh });

    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(img, 0, 0, dw, dh);

    const cx = crop.x * dw;
    const cy = crop.y * dh;
    const cw = crop.w * dw;
    const ch = crop.h * dh;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, dw, cy);
    ctx.fillRect(0, cy + ch, dw, dh - cy - ch);
    ctx.fillRect(0, cy, cx, ch);
    ctx.fillRect(cx + cw, cy, dw - cx - cw, ch);

    ctx.strokeStyle = "#A89BFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 1, cy + 1, Math.max(0, cw - 2), Math.max(0, ch - 2));

    ctx.strokeStyle = "rgba(168,155,255,0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const gx = cx + (cw * i) / 3;
      const gy = cy + (ch * i) / 3;
      ctx.beginPath();
      ctx.moveTo(gx, cy);
      ctx.lineTo(gx, cy + ch);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, gy);
      ctx.lineTo(cx + cw, gy);
      ctx.stroke();
    }

    const hs = 12;
    ctx.fillStyle = "#A89BFF";
    const handles: [number, number][] = [
      [cx, cy],
      [cx + cw / 2, cy],
      [cx + cw, cy],
      [cx + cw, cy + ch / 2],
      [cx + cw, cy + ch],
      [cx + cw / 2, cy + ch],
      [cx, cy + ch],
      [cx, cy + ch / 2],
    ];
    for (const [hx, hy] of handles) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }
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

  const hitHandle = (p: { x: number; y: number }): Handle => {
    const tol = 0.045;
    const l = crop.x;
    const r = crop.x + crop.w;
    const t = crop.y;
    const b = crop.y + crop.h;
    const mx = crop.x + crop.w / 2;
    const my = crop.y + crop.h / 2;
    const near = (ax: number, ay: number) => Math.hypot(p.x - ax, p.y - ay) < tol;
    if (near(l, t)) return "nw";
    if (near(r, t)) return "ne";
    if (near(l, b)) return "sw";
    if (near(r, b)) return "se";
    if (near(mx, t)) return "n";
    if (near(mx, b)) return "s";
    if (near(l, my)) return "w";
    if (near(r, my)) return "e";
    return "move";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = pointerPos(e);
    const h = hitHandle(p);
    setDragging(h);
    dragStart.current = { mx: p.x, my: p.y, crop: { ...crop } };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const clampCrop = (c: Rect): Rect => {
    let { x, y, w, h } = c;
    w = Math.max(MIN_FRAC, Math.min(w, 1));
    h = Math.max(MIN_FRAC, Math.min(h, 1));
    x = Math.max(0, Math.min(x, 1 - w));
    y = Math.max(0, Math.min(y, 1 - h));
    return { x, y, w, h };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const p = pointerPos(e);
    const dx = p.x - dragStart.current.mx;
    const dy = p.y - dragStart.current.my;
    const base = dragStart.current.crop;
    const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

    if (dragging === "move") {
      setCrop(clampCrop({ ...base, x: base.x + dx, y: base.y + dy }));
      return;
    }

    let { x, y, w, h } = base;
    const applyAspect = (nx: number, ny: number, nw: number, nh: number) => {
      if (ratio == null) return clampCrop({ x: nx, y: ny, w: nw, h: nh });
      let rw = Math.max(MIN_FRAC, nw);
      let rh = rw / ratio;
      if (dragging === "n" || dragging === "s") {
        rh = Math.max(MIN_FRAC, nh);
        rw = rh * ratio;
      }
      if (rw > 1) {
        rw = 1;
        rh = rw / ratio;
      }
      if (rh > 1) {
        rh = 1;
        rw = rh * ratio;
      }
      let rx = nx;
      let ry = ny;
      if (dragging === "e" || dragging === "ne" || dragging === "se") rx = x;
      if (dragging === "w" || dragging === "nw" || dragging === "sw") rx = x + w - rw;
      if (dragging === "s" || dragging === "se" || dragging === "sw") ry = y;
      if (dragging === "n" || dragging === "ne" || dragging === "nw") ry = y + h - rh;
      if (dragging === "e" || dragging === "w") ry = y + (h - rh) / 2;
      if (dragging === "n" || dragging === "s") rx = x + (w - rw) / 2;
      return clampCrop({ x: rx, y: ry, w: rw, h: rh });
    };

    switch (dragging) {
      case "e":
        setCrop(applyAspect(x, y, base.w + dx, h));
        break;
      case "w":
        setCrop(applyAspect(base.x + dx, y, base.w - dx, h));
        break;
      case "s":
        setCrop(applyAspect(x, y, w, base.h + dy));
        break;
      case "n":
        setCrop(applyAspect(x, base.y + dy, w, base.h - dy));
        break;
      case "se":
        setCrop(applyAspect(x, y, base.w + dx, base.h + dy));
        break;
      case "sw":
        setCrop(applyAspect(base.x + dx, y, base.w - dx, base.h + dy));
        break;
      case "ne":
        setCrop(applyAspect(x, base.y + dy, base.w + dx, base.h - dy));
        break;
      case "nw":
        setCrop(applyAspect(base.x + dx, base.y + dy, base.w - dx, base.h - dy));
        break;
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
    onApply(out.toDataURL("image/jpeg", 0.95));
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-auto rounded-t-2xl border border-[#2E3140] bg-[#181A22] p-4 text-[#F2F2F5] shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Crop image</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
          >
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
                  ? "border-[#A89BFF] bg-[#A89BFF]/20 text-[#A89BFF]"
                  : "border-[#2E3140] text-[#9AA0B0] hover:border-[#A89BFF]/40")
              }
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center overflow-hidden rounded-xl border border-[#2E3140] bg-[#12141A]">
          {ready ? (
            <canvas
              ref={canvasRef}
              className="max-h-[55vh] max-w-full touch-none"
              style={{
                cursor:
                  dragging === "move"
                    ? "grabbing"
                    : dragging
                      ? "nwse-resize"
                      : "crosshair",
                width: disp.w || undefined,
                height: disp.h || undefined,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center text-sm text-[#9AA0B0]">
              Loading image…
            </div>
          )}
        </div>

        <p className="mt-2 text-[11px] text-[#9AA0B0]">
          Drag the outer edges and corners to crop. Free starts at full image bounds. Apply
          updates the working photo.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] text-[#F2F2F5] hover:bg-white/10"
            onClick={() => resetCrop(ASPECTS.find((a) => a.id === aspect)?.ratio ?? null)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] border-[#2E3140] bg-transparent text-[#F2F2F5]"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-[44px] bg-[#A89BFF] text-[#12141A] hover:bg-[#9688EE]"
            onClick={apply}
            disabled={!ready}
          >
            Apply crop
          </Button>
        </div>
      </div>
    </div>
  );
}
