/**
 * Circle 2edit mask stage — exports required by circle-remove route.
 * Uses authoritative maskCanvas helpers (WorkingMask.canvas-based).
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { MaskTool, Point, BrushSettings, Size } from "@/components/circle-edit/mask/types";
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

function toolKind(tool: MaskTool): "brush" | "erase" | "path" {
  if (tool === "eraser" || tool === "erase") return "erase";
  if (tool === "brush") return "brush";
  return "path";
}

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange, inkColor = "purple", onHistoryChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const historyRef = useRef<{ past: ImageData[]; future: ImageData[] }>({ past: [], future: [] });
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const pathRef = useRef<Point[]>([]);
  const dispScaleRef = useRef(1);
  const [ready, setReady] = useState(false);

  const settings = (): BrushSettings => ({
    sizePx: brushSize,
    opacity: 100,
    hardness: 80,
    featherPx: 2,
  });

  const notify = useCallback(() => {
    const has = !!maskRef.current && maskHasPaint(maskRef.current);
    onMaskChange?.(has);
    onHistoryChange?.(historyRef.current.past.length > 0, historyRef.current.future.length > 0);
  }, [onMaskChange, onHistoryChange]);

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
    ctx.globalCompositeOperation = "source-over";
    // Tint mask: draw mask canvas with color via multiply-like pass
    const tmp = document.createElement("canvas");
    tmp.width = mask.width;
    tmp.height = mask.height;
    const tctx = tmp.getContext("2d");
    if (tctx) {
      tctx.drawImage(mask.canvas, 0, 0);
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = `rgba(${INK_RGB[inkColor]}, 0.7)`;
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }, [inkColor]);

  const pushHistory = useCallback(() => {
    const snap = snapshotMask(maskRef.current!);
    if (!snap) return;
    historyRef.current.past.push(snap);
    if (historyRef.current.past.length > 40) historyRef.current.past.shift();
    historyRef.current.future = [];
    notify();
  }, [notify]);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => (maskRef.current ? exportMaskNatural(maskRef.current) : null),
      exportMaskStats: () => (maskRef.current ? computeMaskStats(maskRef.current) : null),
      clear: () => {
        if (!maskRef.current) return;
        clearWorkingMask(maskRef.current);
        historyRef.current = { past: [], future: [] };
        notify();
        redraw();
      },
      hasMask: () => !!maskRef.current && maskHasPaint(maskRef.current),
      undo: () => {
        if (!maskRef.current) return;
        const { past, future } = historyRef.current;
        if (!past.length) return;
        const cur = snapshotMask(maskRef.current);
        if (cur) future.push(cur);
        restoreSnapshot(maskRef.current, past.pop()!);
        notify();
        redraw();
      },
      redo: () => {
        if (!maskRef.current) return;
        const { past, future } = historyRef.current;
        if (!future.length) return;
        const cur = snapshotMask(maskRef.current);
        if (cur) past.push(cur);
        restoreSnapshot(maskRef.current, future.pop()!);
        notify();
        redraw();
      },
      canUndo: () => historyRef.current.past.length > 0,
      canRedo: () => historyRef.current.future.length > 0,
      fit: () => redraw(),
    }),
    [notify, redraw],
  );

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      const natural: Size = { width: img.naturalWidth, height: img.naturalHeight };
      const maxEdge = 1280;
      const scale = Math.min(1, maxEdge / Math.max(natural.width, natural.height));
      const w = Math.max(1, Math.round(natural.width * scale));
      const h = Math.max(1, Math.round(natural.height * scale));
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      dispScaleRef.current = w / natural.width;
      maskRef.current = createWorkingMask(natural);
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

  const toNatural = (e: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    if (!canvas || !mask) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    // display → natural
    return { x: sx / Math.max(dispScaleRef.current, 0.0001), y: sy / Math.max(dispScaleRef.current, 0.0001) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || !ready || !maskRef.current) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pushHistory();
    const pt = toNatural(e);
    if (!pt) return;
    lastPtRef.current = pt;
    pathRef.current = [pt];
    const kind = toolKind(tool);
    if (kind === "brush" || kind === "erase") {
      stampBrush(maskRef.current, pt, kind, settings(), dispScaleRef.current);
    }
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || disabled || !maskRef.current) return;
    const pt = toNatural(e);
    if (!pt) return;
    const last = lastPtRef.current;
    const kind = toolKind(tool);
    if (last && (kind === "brush" || kind === "erase")) {
      strokeBetween(maskRef.current, last, pt, kind, settings(), dispScaleRef.current);
    }
    pathRef.current.push(pt);
    lastPtRef.current = pt;
    redraw();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const kind = toolKind(tool);
    if (kind === "path" && pathRef.current.length > 3 && maskRef.current) {
      fillClosedPath(maskRef.current, pathRef.current);
    }
    pathRef.current = [];
    lastPtRef.current = null;
    notify();
    redraw();
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black/40">
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
