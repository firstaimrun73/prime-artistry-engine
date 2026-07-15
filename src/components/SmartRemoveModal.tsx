// Smart Remove ("Circle to Remove") tool.
//
// Paints a translucent red mask over the region the user wants removed and
// composites it onto the source image so the image-to-image model can see
// exactly what to erase. Works with mouse, pen, and touch on mobile.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Eraser, Check } from "lucide-react";

type Props = {
  open: boolean;
  imageUrl: string | null;
  onCancel: () => void;
  onApply: (maskedDataUrl: string) => void;
};

export const SMART_REMOVE_PROMPT =
  "Remove the object marked with the red highlighted overlay completely. Fill the removed area naturally to match surrounding textures, lighting, shadows and perspective. Do not add any new objects. Keep the rest of the image identical.";

export function SmartRemoveModal({ open, imageUrl, onCancel, onApply }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  const [brush, setBrush] = useState(40);
  const [hasMark, setHasMark] = useState(false);
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setReady(false);
      setHasMark(false);
      setApplying(false);
      setDisplaySize(null);
      lastPtRef.current = null;
      drawingRef.current = false;
    }
  }, [open]);

  // Size the canvas to the image's natural resolution; the wrapper is sized to
  // the image's rendered box so the overlay lines up 1:1 visually.
  const syncSize = () => {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c) return;
    if (!img.naturalWidth || !img.naturalHeight) return;
    if (c.width !== img.naturalWidth || c.height !== img.naturalHeight) {
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
    }
    setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
  };

  const onImageLoad = () => {
    syncSize();
    setReady(true);
    setHasMark(false);
  };

  useEffect(() => {
    if (!open) return;
    const onResize = () => syncSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const pointFromClient = (clientX: number, clientY: number) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      r: (brush / 2) * ((scaleX + scaleY) / 2),
    };
  };

  const stroke = (fromX: number, fromY: number, toX: number, toY: number, r: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(toX, toY, r, 0, Math.PI * 2);
    ctx.fill();
    setHasMark(true);
  };

  const startAt = (clientX: number, clientY: number) => {
    const p = pointFromClient(clientX, clientY);
    lastPtRef.current = { x: p.x, y: p.y };
    stroke(p.x, p.y, p.x, p.y, p.r);
  };
  const moveTo = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const p = pointFromClient(clientX, clientY);
    const prev = lastPtRef.current ?? { x: p.x, y: p.y };
    stroke(prev.x, prev.y, p.x, p.y, p.r);
    lastPtRef.current = { x: p.x, y: p.y };
  };

  // Pointer events cover mouse + pen + most touch. Explicit touch handlers
  // added below with { passive: false } to reliably preventDefault on iOS.
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return; // handled by touch handlers
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    startAt(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return;
    moveTo(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return;
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawingRef.current = false;
    lastPtRef.current = null;
  };

  // iOS Safari ignores CSS touch-action for canvas in some layouts, so attach
  // native non-passive touch listeners that call preventDefault.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ready) return;
    const start = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      drawingRef.current = true;
      startAt(t.clientX, t.clientY);
    };
    const move = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      moveTo(t.clientX, t.clientY);
    };
    const end = (e: TouchEvent) => {
      e.preventDefault();
      drawingRef.current = false;
      lastPtRef.current = null;
    };
    c.addEventListener("touchstart", start, { passive: false });
    c.addEventListener("touchmove", move, { passive: false });
    c.addEventListener("touchend", end, { passive: false });
    c.addEventListener("touchcancel", end, { passive: false });
    return () => {
      c.removeEventListener("touchstart", start);
      c.removeEventListener("touchmove", move);
      c.removeEventListener("touchend", end);
      c.removeEventListener("touchcancel", end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, brush]);

  const clearMask = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    setHasMark(false);
  };

  const countPaintedPixels = () => {
    const c = canvasRef.current;
    if (!c) return 0;
    const ctx = c.getContext("2d");
    if (!ctx) return 0;
    try {
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let count = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
      return count;
    } catch {
      return 0;
    }
  };

  const apply = async () => {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c || !hasMark) return;
    const painted = countPaintedPixels();
    if (painted === 0) {
      setHasMark(false);
      return;
    }
    setApplying(true);
    try {
      const out = document.createElement("canvas");
      out.width = img.naturalWidth;
      out.height = img.naturalHeight;
      const octx = out.getContext("2d");
      if (!octx) return;
      octx.drawImage(img, 0, 0);
      octx.drawImage(c, 0, 0);
      const dataUrl = out.toDataURL("image/png");
      console.log("[SmartRemove] apply", {
        maskW: c.width,
        maskH: c.height,
        paintedPixels: painted,
        payloadKB: Math.round(dataUrl.length / 1024),
      });
      onApply(dataUrl);
    } finally {
      setApplying(false);
    }
  };

  if (!open || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-base font-bold">Circle to Remove</h2>
            <p className="text-xs text-muted-foreground">
              Paint over anything you want gone. Costs 25 credits — same as a normal edit.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center bg-black/40 p-2" style={{ maxHeight: "60vh" }}>
          <div
            ref={stageRef}
            className="relative"
            style={{
              width: displaySize?.w,
              height: displaySize?.h,
              maxWidth: "100%",
              touchAction: "none",
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              onLoad={onImageLoad}
              draggable={false}
              alt="edit source"
              className="block max-h-[56vh] w-auto max-w-full select-none"
              style={{ userSelect: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
              onContextMenu={(e) => e.preventDefault()}
            />
            {ready && (
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute inset-0 h-full w-full cursor-crosshair"
                style={{ touchAction: "none", zIndex: 10 }}
              />
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="w-16 shrink-0">Brush</span>
            <Slider
              value={[brush]}
              min={10}
              max={140}
              step={2}
              onValueChange={(v) => setBrush(v[0])}
            />
            <span className="w-8 text-right tabular-nums text-foreground">{brush}</span>
          </div>
          {!hasMark && ready && (
            <p className="text-center text-xs text-muted-foreground">
              Drag on the image to paint the area you want removed.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={clearMask} disabled={!hasMark || applying}>
              <Eraser className="mr-1.5 h-4 w-4" /> Clear Selection
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={!hasMark || applying}>
              <Check className="mr-1.5 h-4 w-4" />
              {applying ? "Applying…" : hasMark ? "Apply" : "No area selected"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
