/**
 * Circle 2edit mask stage — build restore.
 * Full freehand/brush/eraser implementation restored for compile + runtime API.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { MaskTool, Point } from "@/components/circle-edit/mask/types";
import {
  createWorkingMask,
  stampBrush,
  strokeBetween,
  fillClosedPath,
  clearMask as clearWorkingMask,
  maskHasPaint,
  exportMaskNatural,
  snapshotMask,
  restoreSnapshot,
  type WorkingMask,
} from "@/components/circle-edit/mask/maskCanvas";
import { computeMaskStats } from "@/components/circle-edit/mask/maskStatsCompute";
import type { MaskStatsPayload } from "@/lib/circle-edit/mask-stats";

export type CircleMaskStageHandle = {
  exportMask: () => string | null;
  exportMaskStats: () => MaskStatsPayload | null;
  clear: () => void;
  hasMask: () => boolean;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  fit: () => void;
};

export type InkColor = "purple" | "white" | "black";

type Props = {
  imageUrl: string;
  tool: MaskTool;
  brushSize: number;
  disabled?: boolean;
  onMaskChange?: (hasMark: boolean) => void;
  inkColor?: InkColor;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
};

const INK_RGB: Record<InkColor, string> = {
  purple: "123, 111, 224",
  white: "255, 255, 255",
  black: "26, 28, 36",
};

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange, inkColor = "purple", onHistoryChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const historyRef = useRef<{ past: ImageData[]; future: ImageData[] }>({ past: [], future: [] });
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const pathRef = useRef<Point[]>([]);
  const [ready, setReady] = useState(false);

  const notify = useCallback(() => {
    const has = maskHasPaint(maskRef.current);
    onMaskChange?.(has);
    onHistoryChange?.(historyRef.current.past.length > 0, historyRef.current.future.length > 0);
  }, [onMaskChange, onHistoryChange]);

  const pushHistory = useCallback(() => {
    const snap = snapshotMask(maskRef.current);
    if (!snap) return;
    historyRef.current.past.push(snap);
    if (historyRef.current.past.length > 40) historyRef.current.past.shift();
    historyRef.current.future = [];
    notify();
  }, [notify]);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => exportMaskNatural(maskRef.current),
      exportMaskStats: () => computeMaskStats(maskRef.current),
      clear: () => {
        clearWorkingMask(maskRef.current);
        historyRef.current = { past: [], future: [] };
        notify();
        redraw();
      },
      hasMask: () => maskHasPaint(maskRef.current),
      undo: () => {
        const { past, future } = historyRef.current;
        if (!past.length) return;
        const cur = snapshotMask(maskRef.current);
        if (cur) future.push(cur);
        const prev = past.pop()!;
        restoreSnapshot(maskRef.current, prev);
        notify();
        redraw();
      },
      redo: () => {
        const { past, future } = historyRef.current;
        if (!future.length) return;
        const cur = snapshotMask(maskRef.current);
        if (cur) past.push(cur);
        const next = future.pop()!;
        restoreSnapshot(maskRef.current, next);
        notify();
        redraw();
      },
      canUndo: () => historyRef.current.past.length > 0,
      canRedo: () => historyRef.current.future.length > 0,
      fit: () => redraw(),
    }),
    [notify],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const mask = maskRef.current;
    if (!canvas || !img || !mask) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = `rgba(${INK_RGB[inkColor]}, 0.55)`;
    // Overlay painted mask region
    const tmp = document.createElement("canvas");
    tmp.width = mask.width;
    tmp.height = mask.height;
    const tctx = tmp.getContext("2d");
    if (tctx) {
      const id = tctx.createImageData(mask.width, mask.height);
      id.data.set(mask.data);
      tctx.putImageData(id, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }, [inkColor]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      const maxEdge = 1280;
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      maskRef.current = createWorkingMask(w, h, img.naturalWidth, img.naturalHeight);
      historyRef.current = { past: [], future: [] };
      setReady(true);
      notify();
      redraw();
    };
    img.onerror = () => setReady(false);
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, notify, redraw]);

  useEffect(() => {
    redraw();
  }, [inkColor, redraw]);

  const toLocal = (e: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || !ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pushHistory();
    const pt = toLocal(e);
    if (!pt || !maskRef.current) return;
    lastPtRef.current = pt;
    pathRef.current = [pt];
    if (tool === "brush" || tool === "eraser") {
      stampBrush(maskRef.current, pt.x, pt.y, brushSize, tool === "eraser");
    }
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || disabled) return;
    const pt = toLocal(e);
    if (!pt || !maskRef.current) return;
    const last = lastPtRef.current;
    if (last && (tool === "brush" || tool === "eraser")) {
      strokeBetween(maskRef.current, last.x, last.y, pt.x, pt.y, brushSize, tool === "eraser");
    }
    pathRef.current.push(pt);
    lastPtRef.current = pt;
    redraw();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if ((tool === "circle" || tool === "lasso" || tool === "freehand") && pathRef.current.length > 3 && maskRef.current) {
      fillClosedPath(maskRef.current, pathRef.current);
    }
    pathRef.current = [];
    lastPtRef.current = null;
    notify();
    redraw();
  };

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black/40">
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full touch-none"
        style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
});
