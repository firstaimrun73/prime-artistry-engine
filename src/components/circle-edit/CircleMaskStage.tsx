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

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;
const CLOSE_TOLERANCE_CSS_PX = 28;
const MIN_PATH_POINTS = 4;
const MIN_PATH_LENGTH_NATURAL = 20;
const PATH_SAMPLE_NATURAL = 2.5;
const INK_RGB: Record<InkColor, string> = {
  purple: "123, 111, 224",
  white: "255, 255, 255",
  black: "26, 28, 36",
};

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
  const s = Math.min(aw / Math.max(1, natural.width), ah / Math.max(1, natural.height), 1);
  return {
    w: Math.max(1, Math.round(natural.width * s)),
    h: Math.max(1, Math.round(natural.height * s)),
  };
}

function smoothPathD(pts: Point[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange, inkColor = "purple", onHistoryChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const pathPtsRef = useRef<Point[]>([]);
  const pathStartRef = useRef<Point | null>(null);
  const strokePtsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const lastSrcRef = useRef<Point | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const toolRef = useRef(tool);
  const brushSizeRef = useRef(brushSize);
  const hasMarkRef = useRef(false);
  const rafVisRef = useRef(0);
  const panningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [natural, setNatural] = useState<Size | null>(null);
  const [viewport, setViewport] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [livePath, setLivePath] = useState<Point[]>([]);
  const [liveStroke, setLiveStroke] = useState<Point[]>([]);
  const [pathNearClose, setPathNearClose] = useState(false);
  const [snapFlash, setSnapFlash] = useState(false);
  const [liveErase, setLiveErase] = useState(false);

  toolRef.current = tool;
  const notifyHistory = useCallback(() => {
    onHistoryChange?.(historyRef.current.length > 0, redoRef.current.length > 0);
  }, [onHistoryChange]);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const fitBox = natural ? containSize(natural, viewport.w, viewport.h) : { w: 0, h: 0 };
  const displayScale =
    natural && fitBox.w > 0 ? (fitBox.w * zoom) / Math.max(1, natural.width) : 1;

  const inkColorRef = useRef(inkColor);
  inkColorRef.current = inkColor;

  const scheduleMaskVis = useCallback(() => {
    if (rafVisRef.current) cancelAnimationFrame(rafVisRef.current);
    rafVisRef.current = requestAnimationFrame(() => {
      rafVisRef.current = 0;
      const wm = maskRef.current;
      const ov = overlayRef.current;
      if (!wm || !ov) return;
      const ctx = ov.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, ov.width, ov.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(wm.canvas, 0, 0, ov.width, ov.height);
      const rgb = INK_RGB[inkColorRef.current] ?? INK_RGB.purple;
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = `rgba(${rgb}, 1)`;
      ctx.fillRect(0, 0, ov.width, ov.height);
      ctx.globalCompositeOperation = "source-over";
    });
  }, []);

  useEffect(() => {
    scheduleMaskVis();
  }, [inkColor, scheduleMaskVis]);

  const closeRadiusNatural = useCallback((): number => {
    const scale = displayScale || 0.001;
    return CLOSE_TOLERANCE_CSS_PX / Math.max(scale, 0.001);
  }, [displayScale]);

  const abortDrawing = useCallback(() => {
    drawingRef.current = false;
    pathPtsRef.current = [];
    pathStartRef.current = null;
    strokePtsRef.current = [];
    lastSrcRef.current = null;
    setLivePath([]);
    setLiveStroke([]);
    setPathNearClose(false);
  }, []);

  const adoptFromSize = useCallback(
    (nw: number, nh: number) => {
      const nat: Size = { width: nw, height: nh };
      setNatural(nat);
      maskRef.current = createWorkingMask(nat);
      historyRef.current = [];
      redoRef.current = [];
      hasMarkRef.current = false;
      notifyHistory();
      onMaskChange?.(false);
      setReady(true);
      abortDrawing();
      scheduleMaskVis();
    },
    [onMaskChange, scheduleMaskVis, abortDrawing, notifyHistory],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setViewport({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewport({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    maskRef.current = null;
    abortDrawing();
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      adoptFromSize(img.naturalWidth || 1, img.naturalHeight || 1);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, adoptFromSize, abortDrawing]);

  useEffect(() => {
    if (!ready || !overlayRef.current || !natural) return;
    const cssW = Math.max(1, Math.round(fitBox.w * zoom));
    const cssH = Math.max(1, Math.round(fitBox.h * zoom));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ov = overlayRef.current;
    ov.width = Math.max(1, Math.round(cssW * dpr));
    ov.height = Math.max(1, Math.round(cssH * dpr));
    ov.style.width = `${cssW}px`;
    ov.style.height = `${cssH}px`;
    scheduleMaskVis();
  }, [ready, zoom, pan, fitBox.w, fitBox.h, natural, scheduleMaskVis]);

  const screenToSource = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const el = containerRef.current;
      if (!el || !natural || !fitBox.w) return null;
      const rect = el.getBoundingClientRect();
      const cssW = fitBox.w * zoomRef.current;
      const cssH = fitBox.h * zoomRef.current;
      const ox = (rect.width - cssW) / 2 + panRef.current.x;
      const oy = (rect.height - cssH) / 2 + panRef.current.y;
      const lx = clientX - rect.left - ox;
      const ly = clientY - rect.top - oy;
      if (lx < 0 || ly < 0 || lx > cssW || ly > cssH) return null;
      return {
        x: (lx / cssW) * natural.width,
        y: (ly / cssH) * natural.height,
      };
    },
    [natural, fitBox.w, fitBox.h],
  );

  const pushHistory = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const snap = snapshotMask(mask);
    if (!snap) return;
    historyRef.current.push(snap);
    if (historyRef.current.length > 30) historyRef.current.shift();
    redoRef.current = [];
    notifyHistory();
  }, [notifyHistory]);

  const applyBrush = useCallback(
    (pt: Point, last: Point | null) => {
      const mask = maskRef.current;
      if (!mask) return;
      const erase = toolRef.current === "erase";
      const kind = erase ? "erase" : "brush";
      const settings = makeBrush(brushSizeRef.current, erase);
      const dispScale = displayScale || 1;
      if (last) strokeBetween(mask, last, pt, kind, settings, dispScale);
      else stampBrush(mask, pt, kind, settings, dispScale);
    },
    [displayScale],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.pointerType === "touch" && !(e as unknown as { isPrimary?: boolean }).isPrimary && e.button !== 0) return;
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      activePointerIdRef.current = e.pointerId;

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        panningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
        return;
      }

      const src = screenToSource(e.clientX, e.clientY);
      if (!src) return;

      drawingRef.current = true;
      lastSrcRef.current = src;

      if (toolRef.current === "circle") {
        pathStartRef.current = src;
        pathPtsRef.current = [src];
        setLivePath([src]);
        setPathNearClose(false);
        setLiveStroke([]);
      } else {
        pushHistory();
        pathPtsRef.current = [];
        setLivePath([]);
        strokePtsRef.current = [src];
        setLiveStroke([src]);
        setLiveErase(toolRef.current === "erase");
        applyBrush(src, null);
        scheduleMaskVis();
      }
      setCursor({ x: e.clientX, y: e.clientY });
    },
    [disabled, screenToSource, pushHistory, applyBrush, scheduleMaskVis],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });

      if (panningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
        return;
      }

      if (!drawingRef.current) return;
      const src = screenToSource(e.clientX, e.clientY);
      if (!src) return;

      if (toolRef.current === "circle") {
        const start = pathStartRef.current;
        if (!start) return;
        const pts = pathPtsRef.current;
        const last = pts[pts.length - 1];
        if (!last || distNatural(last, src) >= PATH_SAMPLE_NATURAL) {
          pts.push(src);
        } else {
          pts[pts.length - 1] = src;
        }
        pathPtsRef.current = pts;
        setLivePath([...pts]);
        const near =
          pts.length >= MIN_PATH_POINTS && distNatural(src, start) <= closeRadiusNatural();
        setPathNearClose(near);
        return;
      }

      strokePtsRef.current.push(src);
      setLiveStroke([...strokePtsRef.current]);
      applyBrush(src, lastSrcRef.current);
      lastSrcRef.current = src;
      scheduleMaskVis();
    },
    [screenToSource, applyBrush, scheduleMaskVis, closeRadiusNatural],
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
        const end = screenToSource(e.clientX, e.clientY) ?? pts[pts.length - 1] ?? null;

        if (mask && start && end && pts.length >= MIN_PATH_POINTS) {
          const near = distNatural(end, start) <= closeRadiusNatural() * 1.15;
          const len = pathLengthNatural(pts);
          if (near && len >= MIN_PATH_LENGTH_NATURAL) {
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
            setSnapFlash(true);
            window.setTimeout(() => setSnapFlash(false), 280);
          }
        }

        pathStartRef.current = null;
        pathPtsRef.current = [];
        setLivePath([]);
        setPathNearClose(false);
      } else {
        setLiveStroke([]);
        strokePtsRef.current = [];
        hasMarkRef.current = maskHasPaint(maskRef.current);
        onMaskChange?.(hasMarkRef.current);
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
      if (toolRef.current === "circle") {
        abortDrawing();
      } else {
        drawingRef.current = false;
        setLiveStroke([]);
        strokePtsRef.current = [];
        lastSrcRef.current = null;
        activePointerIdRef.current = null;
        hasMarkRef.current = maskHasPaint(maskRef.current);
        onMaskChange?.(hasMarkRef.current);
        scheduleMaskVis();
      }
    }
  }, [abortDrawing, onMaskChange, scheduleMaskVis]);

  const fit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => exportMaskNatural(maskRef.current),
      exportMaskStats: () => {
        const wm = maskRef.current;
        if (!wm || !maskHasPaint(wm)) return null;
        return computeMaskStats(wm);
      },
      clear: () => {
        if (maskRef.current) clearWorkingMask(maskRef.current);
        historyRef.current = [];
        redoRef.current = [];
        hasMarkRef.current = false;
        scheduleMaskVis();
        onMaskChange?.(false);
        notifyHistory();
      },
      hasMask: () => maskHasPaint(maskRef.current),
      undo: () => {
        const mask = maskRef.current;
        if (!mask || historyRef.current.length === 0) return;
        const current = snapshotMask(mask);
        if (current) redoRef.current.push(current);
        const prev = historyRef.current.pop();
        if (!prev) return;
        restoreSnapshot(mask, prev);
        hasMarkRef.current = maskHasPaint(mask);
        scheduleMaskVis();
        onMaskChange?.(hasMarkRef.current);
        notifyHistory();
      },
      redo: () => {
        const mask = maskRef.current;
        if (!mask || redoRef.current.length === 0) return;
        const current = snapshotMask(mask);
        if (current) historyRef.current.push(current);
        const next = redoRef.current.pop();
        if (!next) return;
        restoreSnapshot(mask, next);
        hasMarkRef.current = maskHasPaint(mask);
        scheduleMaskVis();
        onMaskChange?.(hasMarkRef.current);
        notifyHistory();
      },
      canUndo: () => historyRef.current.length > 0,
      canRedo: () => redoRef.current.length > 0,
      fit,
    }),
    [scheduleMaskVis, onMaskChange, fit, notifyHistory],
  );

  const cssW = Math.max(1, Math.round(fitBox.w * zoom));
  const cssH = Math.max(1, Math.round(fitBox.h * zoom));
  const pathD = livePath.length > 0 ? smoothPathD(livePath) : "";
  const terminalA = livePath.length > 0 ? livePath[0] : null;
  const terminalB = livePath.length > 1 ? livePath[livePath.length - 1] : null;
  const strokeW = Math.max(1.5, natural ? (natural.width / Math.max(fitBox.w, 1)) * 1.25 : 2);
  const markerR = Math.max(4, natural ? natural.width * 0.008 : 6);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {ready && natural && (
        <div
          className="relative"
          style={{
            width: cssW,
            height: cssH,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "fill", imageRendering: "auto" }}
            width={natural.width}
            height={natural.height}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 h-full w-full"
            style={{ mixBlendMode: "normal", opacity: 0.55, pointerEvents: "none", width: "100%", height: "100%" }}
          />
          {livePath.length > 1 && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${natural.width} ${natural.height}`}
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            >
              <path
                d={pathD}
                fill={pathNearClose ? `rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.18)` : "none"}
                stroke={`rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.95)`}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pathNearClose && livePath.length >= MIN_PATH_POINTS && (
                <path d={pathD + " Z"} fill={`rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.22)`} stroke="none" />
              )}
              {terminalA && (
                <circle
                  cx={terminalA.x}
                  cy={terminalA.y}
                  r={pathNearClose ? markerR * 1.15 : markerR}
                  fill={`rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.95)`}
                  stroke="white"
                  strokeWidth={markerR * 0.25}
                />
              )}
              {terminalB && (
                <circle
                  cx={terminalB.x}
                  cy={terminalB.y}
                  r={pathNearClose ? markerR * 1.15 : markerR * 0.85}
                  fill={pathNearClose ? `rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 1)` : `rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.7)`}
                  stroke="white"
                  strokeWidth={markerR * 0.2}
                />
              )}
            </svg>
          )}
          {liveStroke.length > 0 && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${natural.width} ${natural.height}`}
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            >
              <polyline
                points={liveStroke.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={liveErase ? "rgba(255,255,255,0.92)" : `rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.85)`}
                strokeWidth={brushSize * (natural.width / Math.max(1, fitBox.w * zoom))}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={liveErase ? "6 4" : undefined}
                opacity={0.9}
              />
            </svg>
          )}
          <div
            className="absolute inset-0"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onLostPointerCapture={onLostPointerCapture}
            onPointerLeave={() => {
              if (!drawingRef.current) setCursor(null);
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              pointerEvents: disabled ? "none" : "auto",
              cursor:
                tool === "erase"
                  ? "cell"
                  : tool === "brush"
                    ? "crosshair"
                    : panningRef.current
                      ? "grabbing"
                      : "crosshair",
            }}
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
            borderColor: tool === "erase" ? "rgba(255,255,255,0.95)" : `rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.95)`,
            background: tool === "erase" ? "rgba(255,255,255,0.15)" : `rgba(${INK_RGB[inkColor] ?? INK_RGB.purple}, 0.22)`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
            transform: "translate(-50%, -50%)",
            marginLeft: brushSize / 2,
            marginTop: brushSize / 2,
          }}
        />
      )}

      {snapFlash ? (
        <div
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            background: "radial-gradient(circle at center, rgba(123,111,224,0.28) 0%, transparent 70%)",
            animation: "circle2edit-snap-flash 0.28s ease-out forwards",
          }}
        />
      ) : null}
      <style>{`@keyframes circle2edit-snap-flash { 0% { opacity: 1; } 100% { opacity: 0; } }`}</style>

      {!disabled ? (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-sm font-bold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-sm font-bold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Fit"
            onClick={fit}
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-[10px] font-semibold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
          >
            Fit
          </button>
        </div>
      ) : null}
    </div>
  );
});
