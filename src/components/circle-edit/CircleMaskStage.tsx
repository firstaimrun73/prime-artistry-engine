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
  const liveRef = useRef({
    tool: tool as MaskTool,
    brush: brushSize,
    opacity: 100,
    hardness: 85,
    feather: 2,
    displayScale: 1,
  });

  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [winSize, setWinSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    liveRef.current = { ...liveRef.current, tool, brush: brushSize };
  }, [tool, brushSize]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const fitScale = useMemo(() => {
    const vp = viewportRef.current;
    const n = naturalRef.current;
    if (!vp || !n) return 1;
    return computeContainScale(n, vp.clientWidth, vp.clientHeight, 8);
  }, [ready, winSize.w, winSize.h]);

  const displayScale = fitScale * zoom;
  liveRef.current.displayScale = displayScale;

  const brushSettings = useCallback((): BrushSettings => {
    const L = liveRef.current;
    return { sizePx: L.brush, opacity: L.opacity, hardness: L.hardness, featherPx: L.feather };
  }, []);

  const pushHistory = useCallback(() => {
    const m = maskRef.current;
    if (!m) return;
    const snap = snapshotMask(m);
    if (!snap) return;
    const arr = historyRef.current.slice(0, historyIndexRef.current + 1);
    arr.push(snap);
    if (arr.length > 30) arr.shift();
    historyRef.current = arr;
    historyIndexRef.current = arr.length - 1;
  }, []);

  const paintView = useCallback(() => {
    const view = viewCanvasRef.current;
    const img = imgRef.current;
    const m = maskRef.current;
    const n = naturalRef.current;
    if (!view || !img || !m || !n) return;
    const w = Math.max(1, Math.round(n.width * displayScale));
    const h = Math.max(1, Math.round(n.height * displayScale));
    if (view.width !== w) view.width = w;
    if (view.height !== h) view.height = h;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const tint = document.createElement("canvas");
    tint.width = m.width;
    tint.height = m.height;
    const tctx = tint.getContext("2d");
    if (tctx) {
      tctx.drawImage(m.canvas, 0, 0);
      tctx.globalCompositeOperation = "source-in";
      tctx.fillStyle = "rgba(168, 155, 255, 1)";
      tctx.fillRect(0, 0, tint.width, tint.height);
      ctx.globalAlpha = 0.38;
      ctx.drawImage(tint, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    const path = pathRef.current;
    if (path.length > 0 && liveRef.current.tool === "circle") {
      const sx = displayScale;
      ctx.save();
      ctx.strokeStyle = "rgba(168, 155, 255, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x * sx, path[0].y * sx);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * sx, path[i].y * sx);
      }
      ctx.stroke();
      const start = path[0];
      ctx.beginPath();
      ctx.arc(start.x * sx, start.y * sx, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 155, 255, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (path.length >= MIN_PATH_POINTS) {
        const last = path[path.length - 1];
        const distScreen = Math.hypot((last.x - start.x) * sx, (last.y - start.y) * sx);
        if (distScreen < CLOSE_TOLERANCE_PX * 1.5) {
          ctx.beginPath();
          ctx.arc(start.x * sx, start.y * sx, CLOSE_TOLERANCE_PX / 2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(92, 224, 192, 0.85)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }, [displayScale]);

  const requestPaint = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      paintView();
    });
  }, [paintView]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const markPainted = useCallback(() => {
    if (!hasMarkRef.current) {
      hasMarkRef.current = true;
      onMaskChange?.(true);
    }
  }, [onMaskChange]);

  const onImageLoad = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const natural: Size = { width: img.naturalWidth, height: img.naturalHeight };
    naturalRef.current = natural;
    maskRef.current = createWorkingMask(natural);
    setReady(true);
    hasMarkRef.current = false;
    onMaskChange?.(false);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setTimeout(() => {
      pushHistory();
      paintView();
    }, 0);
  };

  useEffect(() => {
    setReady(false);
    hasMarkRef.current = false;
    maskRef.current = null;
    naturalRef.current = null;
    pathRef.current = [];
    pathStartRef.current = null;
  }, [imageUrl]);

  useEffect(() => {
    if (ready) paintView();
  }, [ready, paintView, zoom, offset]);

  const pointFromClient = (clientX: number, clientY: number): Point => {
    const view = viewCanvasRef.current;
    const n = naturalRef.current;
    if (!view || !n) return { x: 0, y: 0 };
    return clientToNatural(clientX, clientY, view.getBoundingClientRect(), n);
  };

  const pathLengthNatural = (pts: Point[]) => {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return len;
  };

  /** Shoelace area in natural px² — rejects degenerate / near-zero fills. */
  const pathAreaNatural = (pts: Point[]) => {
    if (pts.length < 3) return 0;
    let a = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const j = (i + 1) % n;
      a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a) / 2;
  };

  const tryClosePath = (current: Point): boolean => {
    const start = pathStartRef.current;
    const path = pathRef.current;
    if (!start || path.length < MIN_PATH_POINTS) return false;
    if (pathLengthNatural(path) < MIN_PATH_LENGTH_NATURAL) return false;
    // Reject accidental tiny loops / near-line strokes that would flood-fill wrongly.
    if (pathAreaNatural([...path, start]) < 120) return false;
    const view = viewCanvasRef.current;
    if (!view) return false;
    const rect = view.getBoundingClientRect();
    const sx = rect.width / (naturalRef.current?.width || 1);
    const sy = rect.height / (naturalRef.current?.height || 1);
    const distScreen = Math.hypot((current.x - start.x) * sx, (current.y - start.y) * sy);
    if (distScreen > CLOSE_TOLERANCE_PX) return false;

    path.push({ x: start.x, y: start.y });
    const m = maskRef.current;
    if (m) {
      fillClosedPath(m, path);
      markPainted();
      pushHistory();
    }
    pathRef.current = [];
    pathStartRef.current = null;
    pathClosedRef.current = true;
    requestPaint();
    return true;
  };

  const beginStroke = (clientX: number, clientY: number) => {
    const p = pointFromClient(clientX, clientY);
    const L = liveRef.current;
    pathClosedRef.current = false;
    if (L.tool === "circle") {
      pathRef.current = [p];
      pathStartRef.current = p;
      requestPaint();
      return;
    }
    lastPtRef.current = p;
    const m = maskRef.current;
    if (m) {
      stampBrush(m, p, L.tool === "erase" ? "erase" : "brush", brushSettings(), L.displayScale);
      markPainted();
      requestPaint();
    }
  };

  const continueStroke = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const p = pointFromClient(clientX, clientY);
    const L = liveRef.current;
    if (L.tool === "circle" && pathStartRef.current) {
      if (pathClosedRef.current) return;
      const path = pathRef.current;
      const last = path[path.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.5) {
        path.push(p);
      }
      if (tryClosePath(p)) return;
      requestPaint();
      return;
    }
    const m = maskRef.current;
    if (!m) return;
    const prev = lastPtRef.current ?? p;
    strokeBetween(m, prev, p, L.tool === "erase" ? "erase" : "brush", brushSettings(), L.displayScale);
    markPainted();
    lastPtRef.current = p;
    requestPaint();
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const L = liveRef.current;
    if (L.tool === "circle") {
      if (!pathClosedRef.current && pathRef.current.length >= MIN_PATH_POINTS) {
        const last = pathRef.current[pathRef.current.length - 1];
        if (last) tryClosePath(last);
      }
      if (!pathClosedRef.current) {
        pathRef.current = [];
        pathStartRef.current = null;
        requestPaint();
      }
      return;
    }
    lastPtRef.current = null;
    pushHistory();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    // Middle or right mouse button → pan (desktop). Touch pan is two-finger.
    if (e.button === 1 || e.button === 2) {
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      return;
    }
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    beginStroke(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const vp = viewportRef.current;
    if (vp) {
      const r = vp.getBoundingClientRect();
      setCursorPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
    if (panningRef.current && panStartRef.current) {
      setOffset({
        x: panStartRef.current.ox + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.oy + (e.clientY - panStartRef.current.y),
      });
      return;
    }
    continueStroke(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
    if (panningRef.current) {
      panningRef.current = false;
      panStartRef.current = null;
      return;
    }
    endStroke();
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const prevent = (ev: TouchEvent) => {
      if (ev.cancelable) ev.preventDefault();
    };
    el.addEventListener("touchstart", prevent, { passive: false });
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      el.removeEventListener("touchstart", prevent);
      el.removeEventListener("touchmove", prevent);
    };
  }, [ready]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length === 2) {
        // Cancel any in-progress draw; two-finger = pan + pinch only.
        drawingRef.current = false;
        pathRef.current = [];
        pathStartRef.current = null;
        const t0 = ev.touches[0];
        const t1 = ev.touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        const off = offsetRef.current;
        pinchRef.current = {
          dist: Math.hypot(dx, dy),
          zoom: zoomRef.current,
          cx,
          cy,
          ox: off.x,
          oy: off.y,
        };
      }
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 2 && pinchRef.current) {
        const t0 = ev.touches[0];
        const t1 = ev.touches[1];
        const dx = t0.clientX - t1.clientX;
        const dy = t0.clientY - t1.clientY;
        const dist = Math.hypot(dx, dy);
        const cx = (t0.clientX + t1.clientX) / 2;
        const cy = (t0.clientY + t1.clientY) / 2;
        const ratio = dist / Math.max(1, pinchRef.current.dist);
        const nextZoom = Math.max(0.5, Math.min(6, pinchRef.current.zoom * ratio));
        setZoom(nextZoom);
        // Pan by centroid delta (works even when zoom ratio ~ 1).
        setOffset({
          x: pinchRef.current.ox + (cx - pinchRef.current.cx),
          y: pinchRef.current.oy + (cy - pinchRef.current.cy),
        });
      }
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ready]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom((z) => Math.max(0.5, Math.min(6, z * (e.deltaY < 0 ? 1.08 : 0.92))));
    }
  };

  const clear = useCallback(() => {
    const m = maskRef.current;
    if (!m) return;
    clearWorkingMask(m);
    pathRef.current = [];
    pathStartRef.current = null;
    hasMarkRef.current = false;
    onMaskChange?.(false);
    pushHistory();
    requestPaint();
  }, [onMaskChange, pushHistory, requestPaint]);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => {
        const m = maskRef.current;
        if (!m || !hasMarkRef.current || !maskHasPaint(m)) return null;
        return exportMaskNatural(m);
      },
      clear,
      hasMask: () => hasMarkRef.current && !!maskRef.current && maskHasPaint(maskRef.current),
    }),
    [clear],
  );

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
        src={imageUrl}
        onLoad={onImageLoad}
        alt=""
        className="hidden"
        crossOrigin={imageUrl.startsWith("http") ? "anonymous" : undefined}
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
