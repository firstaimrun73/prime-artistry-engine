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
    const { past, future } = historyRef.current;
    onHistoryChange?.(past.length > 0, future.length > 0);
  }, [onMaskChange, onHistoryChange]);

  const pushHistory = useCallback(() => {
    const m = maskRef.current;
    if (!m) return;
    const snap = snapshotMask(m);
    if (!snap) return;
    historyRef.current.past.push(snap);
    if (historyRef.current.past.length > 30) historyRef.current.past.shift();
    historyRef.current.future = [];
    notify();
  }, [notify]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const mask = maskRef.current;
    if (!canvas || !img || !mask) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(mask.canvas, 0, 0, w, h);
    ctx.restore();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      const natural: Size = { width: img.naturalWidth, height: img.naturalHeight };
      maskRef.current = createWorkingMask(natural);
      historyRef.current = { past: [], future: [] };
      const canvas = canvasRef.current;
      if (canvas) {
        const maxW = Math.min(window.innerWidth - 24, 720);
        const scale = Math.min(1, maxW / natural.width);
        canvas.width = Math.round(natural.width * scale);
        canvas.height = Math.round(natural.height * scale);
        dispScaleRef.current = scale;
      }
      setReady(true);
      redraw();
      notify();
    };
    img.onerror = () => setReady(false);
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, redraw, notify]);

  useImperativeHandle(ref, () => ({
    exportMask: () => {
      const m = maskRef.current;
      if (!m || !maskHasPaint(m)) return null;
      return exportMaskNatural(m);
    },
    exportMaskStats: () => {
      const m = maskRef.current;
      if (!m) return null;
      return computeMaskStats(m);
    },
    clear: () => {
      const m = maskRef.current;
      if (!m) return;
      pushHistory();
      clearWorkingMask(m);
      redraw();
      notify();
    },
    hasMask: () => !!maskRef.current && maskHasPaint(maskRef.current),
    undo: () => {
      const m = maskRef.current;
      if (!m || historyRef.current.past.length === 0) return;
      const cur = snapshotMask(m);
      if (cur) historyRef.current.future.push(cur);
      const prev = historyRef.current.past.pop();
      if (prev) restoreSnapshot(m, prev);
      redraw();
      notify();
    },
    redo: () => {
      const m = maskRef.current;
      if (!m || historyRef.current.future.length === 0) return;
      const cur = snapshotMask(m);
      if (cur) historyRef.current.past.push(cur);
      const next = historyRef.current.future.pop();
      if (next) restoreSnapshot(m, next);
      redraw();
      notify();
    },
    canUndo: () => historyRef.current.past.length > 0,
    canRedo: () => historyRef.current.future.length > 0,
    fit: () => redraw(),
  }), [redraw, notify, pushHistory]);

  const toNatural = (e: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (maskRef.current?.natural.width ?? canvas.width);
    const y = ((e.clientY - rect.top) / rect.height) * (maskRef.current?.natural.height ?? canvas.height);
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || !maskRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pushHistory();
    const p = toNatural(e);
    if (!p) return;
    lastPtRef.current = p;
    const kind = toolKind(tool);
    if (kind === "path") {
      pathRef.current = [p];
    } else {
      stampBrush(maskRef.current, p, kind, settings(), dispScaleRef.current);
      redraw();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !maskRef.current) return;
    const p = toNatural(e);
    if (!p) return;
    const kind = toolKind(tool);
    if (kind === "path") {
      pathRef.current.push(p);
    } else if (lastPtRef.current) {
      strokeBetween(maskRef.current, lastPtRef.current, p, kind, settings(), dispScaleRef.current);
      lastPtRef.current = p;
      redraw();
    }
  };

  const onPointerUp = () => {
    if (!drawingRef.current || !maskRef.current) return;
    drawingRef.current = false;
    const kind = toolKind(tool);
    if (kind === "path" && pathRef.current.length >= 3) {
      fillClosedPath(maskRef.current, pathRef.current);
      redraw();
    }
    pathRef.current = [];
    lastPtRef.current = null;
    notify();
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-black/40">
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full touch-none object-contain"
        style={{ imageRendering: "auto" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Loading…</div>
      )}
    </div>
  );
});

export default CircleMaskStage;
