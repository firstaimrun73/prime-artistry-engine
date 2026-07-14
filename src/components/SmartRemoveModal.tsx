// Smart Remove ("Circle to Remove") tool.
//
// Draws a translucent red mask over the region the user wants removed, then
// composites the mask onto the source image (as visible red overlay pixels) so
// the downstream image-to-image model can see and understand which region to
// erase and inpaint. Pure client-side canvas — works with the existing pipeline
// without any new backend calls.

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

// Auto-prompt for the downstream image-to-image edit. The red-overlay hint
// tells the model exactly what to remove and asks for a natural inpaint.
export const SMART_REMOVE_PROMPT =
  "Remove the object marked with the red highlighted overlay completely. Fill the removed area naturally to match surrounding textures, lighting, shadows and perspective. Do not add any new objects. Keep the rest of the image identical.";

export function SmartRemoveModal({ open, imageUrl, onCancel, onApply }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brush, setBrush] = useState(40);
  const [drawing, setDrawing] = useState(false);
  const [hasMark, setHasMark] = useState(false);
  const [ready, setReady] = useState(false);

  // Fit the drawing canvas to the natural image size when it loads.
  useEffect(() => {
    if (!open) {
      setReady(false);
      setHasMark(false);
    }
  }, [open]);

  const onImageLoad = () => {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c) return;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    setReady(true);
    setHasMark(false);
  };

  const canvasPointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      r: (brush / 2) * ((scaleX + scaleY) / 2),
    };
  };

  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { x, y, r } = canvasPointFromEvent(e);
    ctx.fillStyle = "rgba(239, 68, 68, 0.55)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    setHasMark(true);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setDrawing(true);
    paint(e);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    paint(e);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrawing(false);
  };

  const clearMask = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    setHasMark(false);
  };

  // Composite the mask onto the source image and return a data URL.
  const apply = async () => {
    const img = imgRef.current;
    const c = canvasRef.current;
    if (!img || !c || !hasMark) return;
    const out = document.createElement("canvas");
    out.width = img.naturalWidth;
    out.height = img.naturalHeight;
    const octx = out.getContext("2d");
    if (!octx) return;
    octx.drawImage(img, 0, 0);
    octx.drawImage(c, 0, 0);
    const dataUrl = out.toDataURL("image/png");
    onApply(dataUrl);
  };

  if (!open || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={wrapRef}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
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

        <div className="relative bg-black/40" style={{ maxHeight: "60vh" }}>
          <div
            className="relative mx-auto select-none"
            style={{ maxHeight: "60vh", touchAction: "none" }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              onLoad={onImageLoad}
              draggable={false}
              alt="edit source"
              className="block max-h-[60vh] w-auto max-w-full select-none"
              style={{ userSelect: "none", WebkitUserSelect: "none" }}
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
                style={{ touchAction: "none" }}
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={clearMask} disabled={!hasMark}>
              <Eraser className="mr-1.5 h-4 w-4" /> Clear Selection
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={!hasMark}>
              <Check className="mr-1.5 h-4 w-4" /> Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
