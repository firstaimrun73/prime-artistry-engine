/**
 * Unified Circle 2edit canvas — one image, one mask, inline (no modal).
 * Circle = freehand outline → auto-fill interior when path closes.
 * Brush = add mask · Eraser = remove mask.
 * Overlay: translucent violet/lavender (glass-like).
 */

import { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import type { MaskTool, BrushSettings, Point, Size } from "@/components/circle-edit/mask/types";
import { clientToNatural, computeContainScale } from "@/components/circle-edit/mask/maskGeometry";
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

export type CircleMaskStageHandle = {
  exportMask: () => string | null;
  clear: () => void;
  hasMask: () => boolean;
};

type Props = {
  imageUrl: string;
  tool: MaskTool;
  brushSize: number;
  disabled?: boolean;
  onMaskChange?: (hasMark: boolean) => void;
};

/** Screen distance (CSS px) to treat path as closed. */
const CLOSE_TOLERANCE_PX = 28;
/** Minimum path length before close is allowed. */
const MIN_PATH_POINTS = 8;
/** Minimum path perimeter in natural px. */
const MIN_PATH_LENGTH_NATURAL = 40;

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange },
  ref,
) {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const pathRef = useRef<Point[]>([]);
  const pathStartRef = useRef<Point | null>(null);
  const pathClosedRef = useRef(false);
  const panningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    cx: number;
    cy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const hasMarkRef = useRef(false);
  const naturalRef = useRef<Size | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const liveRef = useRef({ path: null as Point[] | null, tool: tool as MaskTool });

  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    liveRef.current.tool = tool;
  }, [tool]);

  const displayScale = useMemo(() => {
    const n = naturalRef.current;
    if (!n || !viewportSize.w || !viewportSize.h) return 1;
    return computeContainScale(n, viewportSize.w, viewportSize.h) * zoom;
  }, [zoom, viewportSize, ready]);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, []);

  const redraw = useCallback(() => {
    const canvas = viewCanvasRef.current;
    const mask = maskRef.current;
    const n = naturalRef.current;
    const img = imgRef.current;
    if (!canvas || !n || !img) return;
    const scale = computeContainScale(n, viewportSize.w, viewportSize.h) * zoomRef.current;
    const dw = Math.max(1, Math.round(n.width * scale));
    const dh = Math.max(1, Math.round(n.height * scale));
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(img, 0, 0, dw, dh);
    if (mask) {
      const tmp = document.createElement("canvas");
      tmp.width = n.width;
      tmp.height = n.height;
      const tctx = tmp.getContext("2d");
      if (tctx) {
        tctx.putImageData(mask.data, 0, 0);
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(tmp, 0, 0, dw, dh);
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(123, 111, 224, 0.55)";
        ctx.fillRect(0, 0, dw, dh);
        ctx.restore();
      }
    }
    const path = liveRef.current.path;
    if (path && path.length > 1) {
      ctx.save();
      ctx.strokeStyle = "rgba(123, 111, 224, 0.95)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      path.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [viewportSize]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewportSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewportSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    scheduleRedraw();
  }, [displayScale, scheduleRedraw, ready]);

  const applyImageNatural = useCallback(() => {
    const img = imgRef.current;
    if (!img) return false;
    if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return false;
    const n = { width: img.naturalWidth, height: img.naturalHeight };
    naturalRef.current = n;
    maskRef.current = createWorkingMask(n.width, n.height);
    historyRef.current = [];
    historyIndexRef.current = -1;
    hasMarkRef.current = false;
    onMaskChange?.(false);
    setReady(true);
    scheduleRedraw();
    return true;
  }, [onMaskChange, scheduleRedraw]);

  const onImageLoad = useCallback(() => {
    applyImageNatural();
  }, [applyImageNatural]);

  const onImageError = useCallback(() => {
    setReady(false);
    naturalRef.current = null;
    maskRef.current = null;
  }, []);

  useEffect(() => {
    setReady(false);
    naturalRef.current = null;
    maskRef.current = null;
    pathRef.current = [];
    pathStartRef.current = null;
    pathClosedRef.current = false;
    liveRef.current.path = null;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    let cancelled = false;
    const tryAdopt = () => {
      if (cancelled) return;
      if (applyImageNatural()) return;
      requestAnimationFrame(() => {
        if (!cancelled) applyImageNatural();
      });
    };
    tryAdopt();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, applyImageNatural]);

  const pushHistory = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const snap = snapshotMask(mask);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 30) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const clear = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    pushHistory();
    clearWorkingMask(mask);
    hasMarkRef.current = false;
    onMaskChange?.(false);
    pathRef.current = [];
    liveRef.current.path = null;
    scheduleRedraw();
  }, [onMaskChange, pushHistory, scheduleRedraw]);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => {
        const mask = maskRef.current;
        const n = naturalRef.current;
        if (!mask || !n || !maskHasPaint(mask)) return null;
        return exportMaskNatural(mask);
      },
      clear,
      hasMask: () => hasMarkRef.current && !!maskRef.current && maskHasPaint(maskRef.current),
    }),
    [clear],
  );

  const toNatural = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = viewCanvasRef.current;
      const n = naturalRef.current;
      if (!canvas || !n) return null;
      const rect = canvas.getBoundingClientRect();
      return clientToNatural(clientX, clientY, rect, n);
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      const canvas = viewCanvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        panningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          ox: offsetRef.current.x,
          oy: offsetRef.current.y,
        };
        return;
      }
      if (e.button !== 0) return;
      const pt = toNatural(e.clientX, e.clientY);
      if (!pt) return;
      drawingRef.current = true;
      lastPtRef.current = pt;
      const t = liveRef.current.tool;
      if (t === "circle") {
        pathRef.current = [pt];
        pathStartRef.current = pt;
        pathClosedRef.current = false;
        liveRef.current.path = pathRef.current;
      } else {
        pushHistory();
        const mask = maskRef.current;
        if (mask) {
          const settings: BrushSettings = {
            size: brushSize / Math.max(0.01, displayScale),
            hardness: 0.85,
            mode: t === "erase" ? "erase" : "paint",
          };
          stampBrush(mask, pt, settings);
          hasMarkRef.current = maskHasPaint(mask);
          onMaskChange?.(hasMarkRef.current);
        }
      }
      scheduleRedraw();
    },
    [disabled, toNatural, brushSize, displayScale, pushHistory, onMaskChange, scheduleRedraw],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (rect) setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (panningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setOffset({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
        return;
      }
      if (!drawingRef.current) return;
      const pt = toNatural(e.clientX, e.clientY);
      if (!pt) return;
      const t = liveRef.current.tool;
      if (t === "circle") {
        pathRef.current.push(pt);
        liveRef.current.path = pathRef.current;
        scheduleRedraw();
        return;
      }
      const mask = maskRef.current;
      const last = lastPtRef.current;
      if (mask && last) {
        const settings: BrushSettings = {
          size: brushSize / Math.max(0.01, displayScale),
          hardness: 0.85,
          mode: t === "erase" ? "erase" : "paint",
        };
        strokeBetween(mask, last, pt, settings);
        hasMarkRef.current = maskHasPaint(mask);
        onMaskChange?.(hasMarkRef.current);
        lastPtRef.current = pt;
        scheduleRedraw();
      }
    },
    [toNatural, brushSize, displayScale, onMaskChange, scheduleRedraw],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (panningRef.current) {
        panningRef.current = false;
        panStartRef.current = null;
        return;
      }
      if (!drawingRef.current) return;
      drawingRef.current = false;
      const t = liveRef.current.tool;
      if (t === "circle") {
        const path = pathRef.current;
        const start = pathStartRef.current;
        const mask = maskRef.current;
        if (mask && start && path.length >= MIN_PATH_POINTS) {
          const end = path[path.length - 1];
          const dist = Math.hypot(end.x - start.x, end.y - start.y);
          let perimeter = 0;
          for (let i = 1; i < path.length; i++) {
            perimeter += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
          }
          const scale = displayScale || 1;
          const closeTolNatural = CLOSE_TOLERANCE_PX / scale;
          if (dist <= closeTolNatural && perimeter >= MIN_PATH_LENGTH_NATURAL) {
            pushHistory();
            fillClosedPath(mask, path);
            hasMarkRef.current = maskHasPaint(mask);
            onMaskChange?.(hasMarkRef.current);
          }
        }
        pathRef.current = [];
        pathStartRef.current = null;
        liveRef.current.path = null;
        scheduleRedraw();
      }
      lastPtRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [displayScale, pushHistory, onMaskChange, scheduleRedraw],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(4, Math.max(0.5, z * factor)));
  }, []);

  const n = naturalRef.current;
  const dispW = n ? Math.round(n.width * displayScale) : 0;
  const dispH = n ? Math.round(n.height * displayScale) : 0;

  return (
    <div
      ref={viewportRef}
      className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <img
        ref={imgRef}
        key={imageUrl}
        src={imageUrl}
        onLoad={onImageLoad}
        onError={onImageError}
        alt=""
        className="pointer-events-none absolute h-px w-px opacity-0"
        crossOrigin={imageUrl.startsWith("http") ? "anonymous" : undefined}
        decoding="async"
      />
      {ready && n && (
        <div
          className="absolute"
          style={{
            left: `calc(50% + ${offset.x}px)`,
            top: `calc(50% + ${offset.y}px)`,
            transform: "translate(-50%, -50%)",
            width: dispW,
            height: dispH,
          }}
        >
          <canvas
            ref={viewCanvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => {
              if (!drawingRef.current) setCursorPos(null);
            }}
            onWheel={onWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="block h-full w-full rounded-xl"
            style={{
              cursor:
                tool === "brush" || tool === "erase"
                  ? "none"
                  : panningRef.current
                    ? "grabbing"
                    : "crosshair",
              touchAction: "none",
              pointerEvents: disabled ? "none" : "auto",
            }}
          />
        </div>
      )}
      {cursorPos && (tool === "brush" || tool === "erase") && !disabled && (
        <div
          className="pointer-events-none absolute z-10 rounded-full border-2"
          style={{
            left: cursorPos.x - brushSize / 2,
            top: cursorPos.y - brushSize / 2,
            width: brushSize,
            height: brushSize,
            borderColor:
              tool === "erase" ? "rgba(255,255,255,0.85)" : "rgba(168,155,255,0.95)",
            background:
              tool === "erase" ? "rgba(255,255,255,0.1)" : "rgba(168,155,255,0.2)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />
      )}
    </div>
  );
});
