/**
 * Circle 2edit mask stage — exports required by circle-remove route.
 * Uses authoritative maskCanvas helpers (WorkingMask.canvas-based).
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { WorkingMask } from "@/lib/circle-edit/working-mask";
import {
  clearMaskCanvas,
  paintBrushOnMask,
  paintRectOnMask,
  setMaskFromImageUrl,
} from "@/lib/circle-edit/mask-canvas";

export type CircleMaskTool = "brush" | "rect" | "erase";

export interface CircleMaskStageProps {
  imageUrl: string | null;
  mask: WorkingMask | null;
  tool: CircleMaskTool;
  brushSize: number;
  onMaskChange: (mask: WorkingMask) => void;
  className?: string;
  /** When true, stage fills available height aggressively */
  fill?: boolean;
}

export function CircleMaskStage({
  imageUrl,
  mask,
  tool,
  brushSize,
  onMaskChange,
  className,
  fill = true,
}: CircleMaskStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImgSize(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !mask || !imgSize) return;
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mask.canvas, 0, 0);
  }, [mask, imgSize]);

  const toLocal = useCallback((e: ReactPointerEvent) => {
    const canvas = overlayRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!mask || !imgSize) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      const p = toLocal(e);
      if (!p) return;
      last.current = p;
      if (tool === "brush" || tool === "erase") {
        paintBrushOnMask(mask, p.x, p.y, brushSize, tool === "erase");
        onMaskChange({ ...mask });
      }
    },
    [mask, imgSize, tool, brushSize, onMaskChange, toLocal],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!drawing.current || !mask) return;
      const p = toLocal(e);
      if (!p || !last.current) return;
      if (tool === "brush" || tool === "erase") {
        paintBrushOnMask(mask, p.x, p.y, brushSize, tool === "erase");
        onMaskChange({ ...mask });
      }
      last.current = p;
    },
    [mask, tool, brushSize, onMaskChange, toLocal],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (!drawing.current || !mask) return;
      drawing.current = false;
      const p = toLocal(e);
      if (tool === "rect" && last.current && p) {
        paintRectOnMask(mask, last.current.x, last.current.y, p.x, p.y, false);
        onMaskChange({ ...mask });
      }
      last.current = null;
    },
    [mask, tool, onMaskChange, toLocal],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/40",
        fill && "h-full",
        className,
      )}
    >
      {imageUrl ? (
        <div className="relative h-full w-full min-h-0 flex-1">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Edit"
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 h-full w-full object-contain touch-none"
            style={{ imageRendering: "pixelated" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Load an image to start</div>
      )}
    </div>
  );
}

export function createEmptyMask(w: number, h: number): WorkingMask {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, w, h);
  return { canvas, width: w, height: h };
}

export async function maskFromUrl(url: string, w: number, h: number): Promise<WorkingMask> {
  const mask = createEmptyMask(w, h);
  await setMaskFromImageUrl(mask, url);
  return mask;
}

export function clearMask(mask: WorkingMask): WorkingMask {
  clearMaskCanvas(mask);
  return { ...mask };
}
