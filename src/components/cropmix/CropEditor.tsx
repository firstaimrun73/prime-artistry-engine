/**
 * Cropmix Crop editor — EXIF-correct, free + 9 presets + custom, undo/redo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Check,
  X,
} from "lucide-react";
import {
  type CropGeometry,
  CROPMIX_VOLT,
  CROP_PRESETS,
  type CropPresetId,
} from "@/lib/cropmix/types";
import {
  loadImageWithExif,
  applyCropToCanvas,
  geometryFromPreset,
  clampGeometry,
} from "@/lib/cropmix/crop-geometry";
import { cn } from "@/lib/utils";

interface CropEditorProps {
  file: File;
  onApply: (dataUrl: string, geometry: CropGeometry, width: number, height: number) => void;
  onCancel: () => void;
}

const MAX_HISTORY = 30;

export function CropEditor({ file, onApply, onCancel }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [geometry, setGeometry] = useState<CropGeometry | null>(null);
  const [preset, setPreset] = useState<CropPresetId>("free");
  const [history, setHistory] = useState<CropGeometry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; geo: CropGeometry } | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { image, width, height, orientation } = await loadImageWithExif(file);
      if (cancelled) return;
      setImg(image);
      setNaturalW(width);
      setNaturalH(height);
      const geo = geometryFromPreset("free", width, height);
      setGeometry(geo);
      setHistory([geo]);
      setHistoryIdx(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const pushHistory = useCallback((geo: CropGeometry) => {
    setHistory((h) => {
      const next = h.slice(0, historyIdx + 1);
      next.push(geo);
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setHistoryIdx((i) => Math.min(i + 1, MAX_HISTORY - 1));
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx <= 0) return;
    const next = historyIdx - 1;
    setHistoryIdx(next);
    setGeometry(history[next]);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const next = historyIdx + 1;
    setHistoryIdx(next);
    setGeometry(history[next]);
  };

  const applyPreset = (id: CropPresetId) => {
    if (!naturalW || !naturalH) return;
    const geo = geometryFromPreset(id, naturalW, naturalH);
    setPreset(id);
    setGeometry(geo);
    pushHistory(geo);
  };

  const rotate = (dir: 1 | -1) => {
    if (!geometry || !naturalW) return;
    // Simple 90° rotation swaps dimensions conceptually via geometry
    const geo: CropGeometry = {
      ...geometry,
      rotation: ((geometry.rotation ?? 0) + dir * 90 + 360) % 360,
    };
    setGeometry(geo);
    pushHistory(geo);
  };

  const flip = (axis: "h" | "v") => {
    if (!geometry) return;
    const geo: CropGeometry = {
      ...geometry,
      flipH: axis === "h" ? !geometry.flipH : geometry.flipH,
      flipV: axis === "v" ? !geometry.flipV : geometry.flipV,
    };
    setGeometry(geo);
    pushHistory(geo);
  };

  // Draw preview
  useEffect(() => {
    if (!img || !geometry || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const maxSide = 800;
    const r = Math.min(1, maxSide / Math.max(naturalW, naturalH));
    canvas.width = Math.round(naturalW * r);
    canvas.height = Math.round(naturalH * r);
    setScale(r);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // Apply flip/rotation roughly for preview
    if (geometry.flipH || geometry.flipV) {
      ctx.translate(
        geometry.flipH ? canvas.width : 0,
        geometry.flipV ? canvas.height : 0,
      );
      ctx.scale(geometry.flipH ? -1 : 1, geometry.flipV ? -1 : 1);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    // Crop overlay
    const gx = geometry.x * r;
    const gy = geometry.y * r;
    const gw = geometry.w * r;
    const gh = geometry.h * r;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, gy);
    ctx.fillRect(0, gy + gh, canvas.width, canvas.height - gy - gh);
    ctx.fillRect(0, gy, gx, gh);
    ctx.fillRect(gx + gw, gy, canvas.width - gx - gw, gh);
    ctx.strokeStyle = CROPMIX_VOLT;
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, gw, gh);
  }, [img, geometry, naturalW, naturalH]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!geometry || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / (canvasRef.current.width || 1));
    const y = (e.clientY - rect.top) / (rect.height / (canvasRef.current.height || 1));
    dragStart.current = { x, y, geo: { ...geometry } };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current || !geometry) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);
    const dx = (x - dragStart.current.x) / scale;
    const dy = (y - dragStart.current.y) / scale;
    const g = dragStart.current.geo;
    const next = clampGeometry(
      { ...g, x: g.x + dx, y: g.y + dy },
      naturalW,
      naturalH,
    );
    setGeometry(next);
  };

  const onPointerUp = () => {
    if (dragging && geometry) {
      pushHistory(geometry);
    }
    setDragging(false);
    dragStart.current = null;
  };

  const handleApply = async () => {
    if (!img || !geometry) return;
    const { dataUrl, width, height } = await applyCropToCanvas(img, geometry, naturalW, naturalH);
    onApply(dataUrl, geometry, width, height);
  };

  if (!img || !geometry) {
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

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90 p-2"
      >
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="shrink-0 space-y-3 border-t border-border bg-card/80 px-3 py-3 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CROP_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                preset === p.id
                  ? "border-transparent text-black"
                  : "border-border text-muted-foreground",
              )}
              style={preset === p.id ? { backgroundColor: CROPMIX_VOLT } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={undo} className="rounded-lg border border-border p-2" aria-label="Undo">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={redo} className="rounded-lg border border-border p-2" aria-label="Redo">
            <RotateCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => rotate(-1)} className="rounded-lg border border-border p-2" aria-label="Rotate left">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => rotate(1)} className="rounded-lg border border-border p-2" aria-label="Rotate right">
            <RotateCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => flip("h")} className="rounded-lg border border-border p-2" aria-label="Flip horizontal">
            <FlipHorizontal className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => flip("v")} className="rounded-lg border border-border p-2" aria-label="Flip vertical">
            <FlipVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
