/** Circle 2edit: sharp img + freehand Circle (A→B close) / Brush / Eraser + WorkingMask */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { MaskTool, BrushSettings, Point, Size } from "@/components/circle-edit/mask/types";
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
  /** Natural-resolution bbox/coverage for Circle Add position prompts (server-validated). */
  exportMaskStats: () => MaskStatsPayload | null;
  clear: () => void;
  hasMask: () => boolean;
  undo: () => void;
  fit: () => void;
};

type Props = {
  imageUrl: string;
  tool: MaskTool;
  brushSize: number;
  disabled?: boolean;
  onMaskChange?: (hasMark: boolean) => void;
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;
/** Screen CSS px — close when B is within this of A (scaled by DPR / zoom via display scale). */
const CLOSE_TOLERANCE_CSS_PX = 28;
const MIN_PATH_POINTS = 4;
const MIN_PATH_LENGTH_NATURAL = 20;
/** Min distance between successive sampled path points (natural px). */
const PATH_SAMPLE_NATURAL = 2.5;
const BRAND = "123, 111, 224";

function pathLengthNatural(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.hypot(dx, dy);
  }
  return len;
}

function distNatural(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeBrush(sizePx: number, erase: boolean): BrushSettings {
  return {
    sizePx: Math.max(6, sizePx),
    opacity: erase ? 100 : 96,
    hardness: erase ? 100 : 85,
    featherPx: erase ? 0 : Math.max(1, sizePx * 0.08),
  };
}

function containSize(natural: Size, vw: number, vh: number, pad = 16): { w: number; h: number } {
  const aw = Math.max(40, vw - pad * 2);
  const ah = Math.max(40, vh - pad * 2);
  const s = Math.min(aw / natural.width, ah / natural.height, 1);
  return {
    w: Math.max(1, Math.round(natural.width * s)),
    h: Math.max(1, Math.round(natural.height * s)),
  };
}

/** Smooth SVG path from natural points (quadratic midpoints). */
function smoothPathD(pts: Point[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const maskVisRef = useRef<HTMLCanvasElement>(null);
  /** Reused tint canvas — avoid allocate-on-every-frame */
  const tintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const naturalRef = useRef<Size | null>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const toolRef = useRef(tool);
  const brushSizeRef = useRef(brushSize);

  const drawingRef = useRef(false);
  const lastSrcRef = useRef<Point | null>(null);
  const pathStartRef = useRef<Point | null>(null);
  const pathPtsRef = useRef<Point[]>([]);
  const strokePtsRef = useRef<Point[]>([]);
  const activePointerIdRef = useRef<number | null>(null);

  const panningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    midX?: number;
    midY?: number;
    panX?: number;
    panY?: number;
  } | null>(null);

  const historyRef = useRef<ImageData[]>([]);
  const historyIdxRef = useRef(-1);
  const hasMarkRef = useRef(false);
  const rafVisRef = useRef<number | null>(null);
  const liveStrokeRafRef = useRef<number | null>(null);
  const pendingStrokeRef = useRef<Point[] | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ w: 360, h: 480 });
  const [livePath, setLivePath] = useState<Point[]>([]);
  const [pathNearClose, setPathNearClose] = useState(false);
  const [liveStroke, setLiveStroke] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const cancelRafs = useCallback(() => {
    if (rafVisRef.current != null) {
      cancelAnimationFrame(rafVisRef.current);
      rafVisRef.current = null;
    }
    if (liveStrokeRafRef.current != null) {
      cancelAnimationFrame(liveStrokeRafRef.current);
      liveStrokeRafRef.current = null;
    }
    if (cursorRafRef.current != null) {
      cancelAnimationFrame(cursorRafRef.current);
      cursorRafRef.current = null;
    }
  }, []);

  const abortDrawing = useCallback(() => {
    drawingRef.current = false;
    pathStartRef.current = null;
    pathPtsRef.current = [];
    strokePtsRef.current = [];
    lastSrcRef.current = null;
    activePointerIdRef.current = null;
    pendingStrokeRef.current = null;
    setLivePath([]);
    setPathNearClose(false);
    setLiveStroke([]);
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    toolRef.current = tool;
    abortDrawing();
  }, [tool, abortDrawing]);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    return () => {
      cancelRafs();
      abortDrawing();
    };
  }, [cancelRafs, abortDrawing]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setViewport({ w: Math.max(2, r.width), h: Math.max(2, r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitBox = natural ? containSize(natural, viewport.w, viewport.h) : { w: 0, h: 0 };

  const screenToSource = useCallback((clientX: number, clientY: number): Point | null => {
    const hit = hitRef.current;
    const nat = naturalRef.current;
    if (!hit || !nat) return null;
    const rect = hit.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const x = ((clientX - rect.left) / rect.width) * nat.width;
    const y = ((clientY - rect.top) / rect.height) * nat.height;
    return {
      x: Math.max(0, Math.min(nat.width, x)),
      y: Math.max(0, Math.min(nat.height, y)),
    };
  }, []);

  const screenToNaturalScale = useCallback((): number => {
    const hit = hitRef.current;
    const nat = naturalRef.current;
    if (!hit || !nat || hit.getBoundingClientRect().width < 1) return 1;
    return hit.getBoundingClientRect().width / nat.width;
  }, []);

  /** Close radius in natural pixels — responsive to zoom/display scale. */
  const closeRadiusNatural = useCallback((): number => {
    const scale = screenToNaturalScale();
    return CLOSE_TOLERANCE_CSS_PX / Math.max(scale, 0.001);
  }, [screenToNaturalScale]);

  const paintMaskVis = useCallback(() => {
    const canvas = maskVisRef.current;
    const mask = maskRef.current;
    const nat = naturalRef.current;
    if (!canvas || !nat) return;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.5);
    const cssW = Math.max(1, Math.round((fitBox.w || 1) * zoomRef.current));
    const cssH = Math.max(1, Math.round((fitBox.h || 1) * zoomRef.current));
    const bw = Math.max(1, Math.round(cssW * dpr));
    const bh = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    if (!mask || !maskHasPaint(mask)) return;

    // Reuse tint canvas sized to working mask
    let tmp = tintCanvasRef.current;
    if (!tmp || tmp.width !== mask.width || tmp.height !== mask.height) {
      tmp = document.createElement("canvas");
      tmp.width = mask.width;
      tmp.height = mask.height;
      tintCanvasRef.current = tmp;
    }
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(mask.canvas, 0, 0);
    tctx.globalCompositeOperation = "source-in";
    tctx.fillStyle = `rgba(${BRAND}, 0.42)`;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.globalCompositeOperation = "source-over";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(tmp, 0, 0, cssW, cssH);
  }, [fitBox.w, fitBox.h]);

  const scheduleMaskVis = useCallback(() => {
    if (rafVisRef.current != null) return;
    rafVisRef.current = requestAnimationFrame(() => {
      rafVisRef.current = null;
      paintMaskVis();
    });
  }, [paintMaskVis]);

  useEffect(() => {
    scheduleMaskVis();
  }, [ready, zoom, pan, fitBox.w, fitBox.h, scheduleMaskVis]);

  const adoptFromSize = useCallback(
    (nw: number, nh: number) => {
      if (nw < 1 || nh < 1) return;
      const nat: Size = { width: nw, height: nh };
      naturalRef.current = nat;
      maskRef.current = createWorkingMask(nat);
      historyRef.current = [];
      historyIdxRef.current = -1;
      hasMarkRef.current = false;
      onMaskChange?.(false);
      setNatural(nat);
      setReady(true);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      abortDrawing();
      scheduleMaskVis();
    },
    [onMaskChange, scheduleMaskVis, abortDrawing],
  );

  useEffect(() => {
    setReady(false);
    setNatural(null);
    naturalRef.current = null;
    maskRef.current = null;
    tintCanvasRef.current = null;
    let cancelled = false;
    const img = new Image();
    if (imageUrl.startsWith("http")) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      adoptFromSize(img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      if (cancelled) return;
      setReady(false);
      setNatural(null);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, adoptFromSize]);

  const pushHistory = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const snap = snapshotMask(mask);
    if (!snap) return;
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 40) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  }, []);

  const clear = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    pushHistory();
    clearWorkingMask(mask);
    hasMarkRef.current = false;
    onMaskChange?.(false);
    abortDrawing();
    scheduleMaskVis();
  }, [onMaskChange, pushHistory, scheduleMaskVis, abortDrawing]);

  const undo = useCallback(() => {
    const mask = maskRef.current;
    if (!mask || historyIdxRef.current < 0) return;
    historyIdxRef.current -= 1;
    const prev = historyRef.current[historyIdxRef.current];
    if (prev) restoreSnapshot(mask, prev);
    else clearWorkingMask(mask);
    hasMarkRef.current = maskHasPaint(mask);
    onMaskChange?.(hasMarkRef.current);
    scheduleMaskVis();
  }, [onMaskChange, scheduleMaskVis]);

  const fit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => {
        const mask = maskRef.current;
        if (!mask || !maskHasPaint(mask)) return null;
        return exportMaskNatural(mask);
      },
      exportMaskStats: () => {
        const mask = maskRef.current;
        if (!mask || !maskHasPaint(mask)) return null;
        return computeMaskStats(mask);
      },
      clear,
      hasMask: () => !!maskRef.current && hasMarkRef.current && maskHasPaint(maskRef.current),
      undo,
      fit,
    }),
    [clear, undo, fit],
  );

  const applyBrush = useCallback(
    (pt: Point, last: Point | null) => {
      const mask = maskRef.current;
      if (!mask) return;
      const erase = toolRef.current === "erase";
      const kind = erase ? "erase" : "brush";
      const settings = makeBrush(brushSizeRef.current, erase);
      const dispScale = Math.max(0.0001, screenToNaturalScale());
      if (last) strokeBetween(mask, last, pt, kind, settings, dispScale);
      else stampBrush(mask, pt, kind, settings, dispScale);
      hasMarkRef.current = maskHasPaint(mask);
      onMaskChange?.(hasMarkRef.current);
    },
    [onMaskChange, screenToNaturalScale],
  );

  const scheduleLivePath = useCallback((pts: Point[]) => {
    pendingStrokeRef.current = pts;
    if (liveStrokeRafRef.current == null) {
      liveStrokeRafRef.current = requestAnimationFrame(() => {
        liveStrokeRafRef.current = null;
        if (pendingStrokeRef.current) {
          setLivePath(pendingStrokeRef.current.slice());
        }
      });
    }
  }, []);

  const scheduleLiveStroke = useCallback((pts: Point[]) => {
    pendingStrokeRef.current = pts;
    if (liveStrokeRafRef.current == null) {
      liveStrokeRafRef.current = requestAnimationFrame(() => {
        liveStrokeRafRef.current = null;
        if (pendingStrokeRef.current) {
          setLiveStroke(pendingStrokeRef.current.slice());
        }
      });
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      const hit = hitRef.current;
      if (!hit) return;
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        panningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          px: panRef.current.x,
          py: panRef.current.y,
        };
        hit.setPointerCapture(e.pointerId);
        activePointerIdRef.current = e.pointerId;
        return;
      }
      if (e.button !== 0) return;
      if (pinchRef.current) return;
      const src = screenToSource(e.clientX, e.clientY);
      if (!src) return;
      hit.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      drawingRef.current = true;
      lastSrcRef.current = src;

      if (toolRef.current === "circle") {
        // Terminal A = first point
        pathStartRef.current = src;
        pathPtsRef.current = [src];
        setLivePath([src]);
        setPathNearClose(false);
        setLiveStroke([]);
        return;
      }

      // Brush / Eraser — paint immediately into working mask
      pushHistory();
      strokePtsRef.current = [src];
      setLiveStroke([src]);
      applyBrush(src, null);
      scheduleMaskVis();
    },
    [disabled, screenToSource, pushHistory, applyBrush, scheduleMaskVis],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const vp = viewportRef.current?.getBoundingClientRect();
      if (vp) {
        pendingCursorRef.current = { x: e.clientX - vp.left, y: e.clientY - vp.top };
        if (cursorRafRef.current == null) {
          cursorRafRef.current = requestAnimationFrame(() => {
            cursorRafRef.current = null;
            if (pendingCursorRef.current) setCursor(pendingCursorRef.current);
          });
        }
      }
      if (panningRef.current && panStartRef.current) {
        setPan({
          x: panStartRef.current.px + (e.clientX - panStartRef.current.x),
          y: panStartRef.current.py + (e.clientY - panStartRef.current.y),
        });
        return;
      }
      if (!drawingRef.current || pinchRef.current) return;
      if (
        activePointerIdRef.current != null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      const src = screenToSource(e.clientX, e.clientY);
      if (!src) return;

      if (toolRef.current === "circle") {
        const start = pathStartRef.current;
        if (!start) return;
        const pts = pathPtsRef.current;
        const last = pts[pts.length - 1];
        // Sample path — do not force ellipse
        if (!last || distNatural(last, src) >= PATH_SAMPLE_NATURAL) {
          pts.push(src);
        } else {
          // Update last point for smooth endpoint tracking
          pts[pts.length - 1] = src;
        }
        pathPtsRef.current = pts;
        scheduleLivePath(pts);

        const near =
          pts.length >= MIN_PATH_POINTS &&
          distNatural(src, start) <= closeRadiusNatural();
        setPathNearClose(near);
        return;
      }

      // Brush / Eraser continuous stroke
      strokePtsRef.current.push(src);
      scheduleLiveStroke(strokePtsRef.current);
      applyBrush(src, lastSrcRef.current);
      lastSrcRef.current = src;
      scheduleMaskVis();
    },
    [
      screenToSource,
      applyBrush,
      scheduleMaskVis,
      scheduleLivePath,
      scheduleLiveStroke,
      closeRadiusNatural,
    ],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent) => {
      if (panningRef.current) {
        panningRef.current = false;
        panStartRef.current = null;
        activePointerIdRef.current = null;
        try {
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      if (!drawingRef.current) return;
      drawingRef.current = false;

      if (toolRef.current === "circle") {
        const start = pathStartRef.current;
        const mask = maskRef.current;
        const pts = pathPtsRef.current.slice();
        const end =
          screenToSource(e.clientX, e.clientY) ?? pts[pts.length - 1] ?? null;

        let committed = false;
        if (mask && start && end && pts.length >= MIN_PATH_POINTS) {
          // Snap B to A if near close
          const near = distNatural(end, start) <= closeRadiusNatural() * 1.15;
          const len = pathLengthNatural(pts);
          if (near && len >= MIN_PATH_LENGTH_NATURAL) {
            // Ensure closed: last point = A
            if (distNatural(pts[pts.length - 1], start) > 0.5) {
              pts.push(start);
            } else {
              pts[pts.length - 1] = start;
            }
            pushHistory();
            fillClosedPath(mask, pts);
            hasMarkRef.current = maskHasPaint(mask);
            onMaskChange?.(hasMarkRef.current);
            scheduleMaskVis();
            committed = true;
          }
        }

        // Always clear temporary overlay (committed or discarded)
        pathStartRef.current = null;
        pathPtsRef.current = [];
        setLivePath([]);
        setPathNearClose(false);
        if (!committed) {
          // incomplete path discarded cleanly
        }
      } else {
        setLiveStroke([]);
        strokePtsRef.current = [];
        scheduleMaskVis();
      }

      lastSrcRef.current = null;
      activePointerIdRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [screenToSource, pushHistory, onMaskChange, scheduleMaskVis, closeRadiusNatural],
  );

  const onLostPointerCapture = useCallback(() => {
    if (drawingRef.current) {
      // Treat as cancel — discard incomplete circle path
      if (toolRef.current === "circle") {
        abortDrawing();
      } else {
        drawingRef.current = false;
        setLiveStroke([]);
        strokePtsRef.current = [];
        lastSrcRef.current = null;
        activePointerIdRef.current = null;
        scheduleMaskVis();
      }
    }
    panningRef.current = false;
    panStartRef.current = null;
  }, [abortDrawing, scheduleMaskVis]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 0.9 : 1.12;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * f)));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ts = (ev: TouchEvent) => {
      if (ev.touches.length === 2) {
        drawingRef.current = false;
        panningRef.current = false;
        abortDrawing();
        const a = ev.touches[0];
        const b = ev.touches[1];
        pinchRef.current = {
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          zoom: zoomRef.current,
          midX: (a.clientX + b.clientX) / 2,
          midY: (a.clientY + b.clientY) / 2,
          panX: panRef.current.x,
          panY: panRef.current.y,
        };
      }
    };
    const tm = (ev: TouchEvent) => {
      if (ev.touches.length === 2 && pinchRef.current) {
        ev.preventDefault();
        const a = ev.touches[0];
        const b = ev.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = dist / Math.max(1, pinchRef.current.dist);
        setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.zoom * ratio)));
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        const prev = pinchRef.current;
        if (prev.midX != null && prev.midY != null && prev.panX != null && prev.panY != null) {
          setPan({
            x: prev.panX + (midX - prev.midX),
            y: prev.panY + (midY - prev.midY),
          });
        }
      }
    };
    const te = () => {
      pinchRef.current = null;
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te, { passive: true });
    el.addEventListener("touchcancel", te, { passive: true });
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", te);
    };
  }, [abortDrawing]);

  const pathD = livePath.length > 0 ? smoothPathD(livePath) : "";
  const strokeD =
    liveStroke.length > 1
      ? liveStroke
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ")
      : "";

  const terminalA = livePath.length > 0 ? livePath[0] : null;
  const terminalB = livePath.length > 1 ? livePath[livePath.length - 1] : null;
  const strokeW = Math.max(1.5, natural ? natural.width / Math.max(fitBox.w, 1) * 1.25 : 2);
  const markerR = Math.max(4, strokeW * 2.5);

  return (
    <div
      ref={viewportRef}
      className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-[#0a0a0c]/4 dark:bg-black/30"
      style={{ touchAction: "none" }}
      onWheel={onWheel}
    >
      {ready && natural && fitBox.w > 0 && (
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            width: Math.max(1, Math.round(fitBox.w * zoom)),
            height: Math.max(1, Math.round(fitBox.h * zoom)),
            position: "relative",
            flexShrink: 0,
          }}
        >
          <img
            src={imageUrl}
            alt=""
            width={natural.width}
            height={natural.height}
            draggable={false}
            decoding="async"
            className="pointer-events-none absolute inset-0 block h-full w-full select-none rounded-xl"
            style={{ objectFit: "fill", imageRendering: "auto" }}
            crossOrigin={imageUrl.startsWith("http") ? "anonymous" : undefined}
          />

          <canvas
            ref={maskVisRef}
            className="pointer-events-none absolute inset-0 h-full w-full rounded-xl"
            style={{ width: "100%", height: "100%" }}
          />

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full rounded-xl"
            viewBox={`0 0 ${natural.width} ${natural.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="circle2edit-path-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={strokeW * 0.8} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Freehand outline while drawing — no solid fill until closed+committed */}
            {pathD && (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke={`rgba(${BRAND}, 0.35)`}
                  strokeWidth={strokeW * 2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#circle2edit-path-glow)"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    pathNearClose
                      ? `rgba(255,255,255,0.95)`
                      : `rgba(${BRAND}, 0.95)`
                  }
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Subtle preview fill only when near-close (not committed yet) */}
                {pathNearClose && livePath.length >= MIN_PATH_POINTS && (
                  <path
                    d={`${pathD} Z`}
                    fill={`rgba(${BRAND}, 0.18)`}
                    stroke="none"
                  />
                )}
              </>
            )}

            {/* Terminal A */}
            {terminalA && (
              <g>
                {pathNearClose && (
                  <circle
                    cx={terminalA.x}
                    cy={terminalA.y}
                    r={markerR * 2.2}
                    fill="none"
                    stroke={`rgba(${BRAND}, 0.55)`}
                    strokeWidth={strokeW * 0.6}
                    opacity={0.9}
                  >
                    <animate
                      attributeName="r"
                      values={`${markerR * 1.8};${markerR * 2.6};${markerR * 1.8}`}
                      dur="1.1s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.7;0.25;0.7"
                      dur="1.1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={terminalA.x}
                  cy={terminalA.y}
                  r={markerR}
                  fill={`rgba(${BRAND}, 0.95)`}
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth={strokeW * 0.45}
                />
              </g>
            )}

            {/* Terminal B */}
            {terminalB && (
              <circle
                cx={terminalB.x}
                cy={terminalB.y}
                r={pathNearClose ? markerR * 1.15 : markerR * 0.85}
                fill={
                  pathNearClose
                    ? "rgba(255,255,255,0.95)"
                    : `rgba(${BRAND}, 0.85)`
                }
                stroke={
                  pathNearClose
                    ? `rgba(${BRAND}, 0.95)`
                    : "rgba(255,255,255,0.9)"
                }
                strokeWidth={strokeW * 0.4}
              />
            )}

            {/* Brush live stroke preview */}
            {strokeD && (
              <path
                d={strokeD}
                fill="none"
                stroke={`rgba(${BRAND}, 0.55)`}
                strokeWidth={Math.max(
                  2,
                  brushSize / Math.max(screenToNaturalScale(), 0.001),
                )}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          <div
            ref={hitRef}
            className="absolute inset-0 z-10 rounded-xl"
            style={{
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
              cursor:
                tool === "brush" || tool === "erase"
                  ? "none"
                  : panningRef.current
                    ? "grabbing"
                    : "crosshair",
              pointerEvents: disabled ? "none" : "auto",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onLostPointerCapture={onLostPointerCapture}
            onPointerLeave={() => {
              if (!drawingRef.current) setCursor(null);
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      )}

      {cursor && (tool === "brush" || tool === "erase") && !disabled && (
        <div
          className="pointer-events-none absolute z-20 rounded-full border-2"
          style={{
            left: cursor.x - brushSize / 2,
            top: cursor.y - brushSize / 2,
            width: brushSize,
            height: brushSize,
            borderColor:
              tool === "erase" ? "rgba(255,255,255,0.95)" : `rgba(${BRAND}, 0.95)`,
            background:
              tool === "erase" ? "rgba(255,255,255,0.15)" : `rgba(${BRAND}, 0.22)`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
          }}
        />
      )}

      <div className="pointer-events-auto absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Zoom in"
          disabled={disabled}
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-sm font-bold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={disabled}
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-sm font-bold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Fit"
          disabled={disabled}
          onClick={fit}
          className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-[10px] font-semibold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
        >
          Fit
        </button>
      </div>
    </div>
  );
});
