/**
 * Cropmix Crop editor — EXIF-correct, free + presets + custom, undo/redo.
 * Preview re-renders on every rotate/flip/straighten change.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ASPECT_PRESETS,
  DEFAULT_CROP,
  applyAspect,
  clampCrop,
  drawOriented,
  historyInit,
  historyPush,
  historyRedo,
  historyUndo,
  readExifOrientation,
  renderCropToCanvas,
  type HistoryStack,
} from "@/lib/cropmix/crop-geometry";
import type { CropGeometry } from "@/lib/cropmix/types";
import { CROPMIX_VOLT } from "@/lib/cropmix/types";

type Props = {
  file: File;
  initialGeometry?: CropGeometry;
  onApply: (dataUrl: string, geometry: CropGeometry, width: number, height: number) => void;
  onCancel: () => void;
};

export function CropEditor({ file, initialGeometry, onApply, onCancel }: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [srcSize, setSrcSize] = useState({ w: 1, h: 1 });
  const [ready, setReady] = useState(false);
  const [hist, setHist] = useState<HistoryStack<CropGeometry>>(() =>
    historyInit(initialGeometry ?? DEFAULT_CROP),
  );
  const g = hist.present;
  const dragRef = useRef<{ startX: number; startY: number; origin: CropGeometry } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      const buf = await file.arrayBuffer();
      const orientation = readExifOrientation(buf);
      objectUrl = URL.createObjectURL(new Blob([buf]));
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("decode"));
        img.src = objectUrl!;
      });
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const size = drawOriented(img, orientation, canvas);
      sourceCanvasRef.current = canvas;
      setSrcSize({ w: size.width, h: size.height });
      setHist(historyInit(applyAspect(initialGeometry ?? DEFAULT_CROP, size.width, size.height)));
      setReady(true);
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    })().catch(() => setReady(false));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      sourceCanvasRef.current = null;
    };
  }, [file, initialGeometry]);

  const commit = useCallback((next: CropGeometry) => {
    setHist((h) => historyPush(h, clampCrop(next)));
  }, []);

  const setAspect = (id: (typeof ASPECT_PRESETS)[number]["id"]) => {
    commit(applyAspect({ ...g, aspectId: id }, srcSize.w, srcSize.h));
  };

  // Preview draw — applies rotate90 / flipH / flipV so UI matches export
  useEffect(() => {
    if (!ready || !sourceCanvasRef.current || !previewRef.current) return;
    const src = sourceCanvasRef.current;
    const canvas = previewRef.current;
    const maxSide = 720;
    const r = ((g.rotate90 % 4) + 4) % 4;
    const baseW = src.width;
    const baseH = src.height;
    const rotatedW = r === 1 || r === 3 ? baseH : baseW;
    const rotatedH = r === 1 || r === 3 ? baseW : baseH;
    const scale = Math.min(1, maxSide / Math.max(rotatedW, rotatedH));
    const dispW = Math.max(1, Math.round(rotatedW * scale));
    const dispH = Math.max(1, Math.round(rotatedH * scale));
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, dispW, dispH);

    ctx.save();
    if (r === 1) {
      ctx.translate(dispW, 0);
      ctx.rotate(0.5 * Math.PI);
    } else if (r === 2) {
      ctx.translate(dispW, dispH);
      ctx.rotate(Math.PI);
    } else if (r === 3) {
      ctx.translate(0, dispH);
      ctx.rotate(-0.5 * Math.PI);
    }
    const workW = r === 1 || r === 3 ? dispH : dispW;
    const workH = r === 1 || r === 3 ? dispW : dispH;
    if (g.flipH || g.flipV) {
      ctx.translate(g.flipH ? workW : 0, g.flipV ? workH : 0);
      ctx.scale(g.flipH ? -1 : 1, g.flipV ? -1 : 1);
    }
    ctx.drawImage(src, 0, 0, workW, workH);
    ctx.restore();

    const corners = [
      { x: g.x, y: g.y },
      { x: g.x + g.w, y: g.y },
      { x: g.x + g.w, y: g.y + g.h },
      { x: g.x, y: g.y + g.h },
    ];
    const mapPoint = (nx: number, ny: number) => {
      let px = nx * baseW;
      let py = ny * baseH;
      if (g.flipH) px = baseW - px;
      if (g.flipV) py = baseH - py;
      let qx = px;
      let qy = py;
      if (r === 1) {
        qx = baseH - py;
        qy = px;
      } else if (r === 2) {
        qx = baseW - px;
        qy = baseH - py;
      } else if (r === 3) {
        qx = py;
        qy = baseW - px;
      }
      return { x: qx * scale, y: qy * scale };
    };
    const pts = corners.map((c) => mapPoint(c.x, c.y));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const gx = minX;
    const gy = minY;
    const gw = Math.max(1, maxX - minX);
    const gh = Math.max(1, maxY - minY);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, dispW, gy);
    ctx.fillRect(0, gy + gh, dispW, dispH - gy - gh);
    ctx.fillRect(0, gy, gx, gh);
    ctx.fillRect(gx + gw, gy, dispW - gx - gw, gh);
    ctx.strokeStyle = CROPMIX_VOLT;
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, gw, gh);
  }, [ready, g, srcSize]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: g };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const o = dragRef.current.origin;
    commit(clampCrop({ ...o, x: o.x + dx, y: o.y + dy }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleApply = () => {
    if (!sourceCanvasRef.current) return;
    const { canvas, width, height } = renderCropToCanvas(sourceCanvasRef.current, g);
    onApply(canvas.toDataURL("image/jpeg", 0.95), g, width, height);
  };

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onCancel}
          className="grid h-9 w-9 place-items-center rounded-full border border-border"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm font-semibold">Crop</span>
        <button
          type="button"
          onClick={handleApply}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-black"
          style={{ backgroundColor: CROPMIX_VOLT }}
        >
          <Check className="h-4 w-4" />
          Apply
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90 p-2">
        <canvas
          ref={previewRef}
          className="max-h-full max-w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="shrink-0 space-y-3 border-t border-border bg-card/80 px-3 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ASPECT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAspect(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                g.aspectId === p.id
                  ? "border-transparent text-black"
                  : "border-border text-muted-foreground",
              )}
              style={g.aspectId === p.id ? { backgroundColor: CROPMIX_VOLT } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setHist((h) => historyUndo(h))} className="rounded-lg border border-border p-2" aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setHist((h) => historyRedo(h))} className="rounded-lg border border-border p-2" aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => commit({ ...g, rotate90: ((g.rotate90 % 4) + 3) % 4 })} className="rounded-lg border border-border p-2" aria-label="Rotate left">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => commit({ ...g, rotate90: ((g.rotate90 % 4) + 1) % 4 })} className="rounded-lg border border-border p-2" aria-label="Rotate right">
            <RotateCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => commit({ ...g, flipH: !g.flipH })} className="rounded-lg border border-border p-2" aria-label="Flip horizontal">
            <FlipHorizontal className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => commit({ ...g, flipV: !g.flipV })} className="rounded-lg border border-border p-2" aria-label="Flip vertical">
            <FlipVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
