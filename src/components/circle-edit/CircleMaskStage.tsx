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
  const scale = Math.min(aw / Math.max(1, natural.w), ah / Math.max(1, natural.h));
  return {
    w: Math.max(1, Math.round(natural.w * scale)),
    h: Math.max(1, Math.round(natural.h * scale)),
  };
}

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const workingRef = useRef<WorkingMask | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const pathRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const toolRef = useRef(tool);
  const brushSizeRef = useRef(brushSize);
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    cx: number;
    cy: number;
  } | null>(null);
  const rafVisRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [natural, setNatural] = useState<Size>({ w: 1, h: 1 });
  const [fitBox, setFitBox] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState<Point | null>(null);
  const [livePath, setLivePath] = useState<Point[] | null>(null);
  const [liveStroke, setLiveStroke] = useState<{ pts: Point[]; erase: boolean } | null>(null);

  // Keep refs in sync
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  // Sync toolRef immediately so first stroke after switch never uses stale tool
  toolRef.current = tool;

  const scheduleMaskVis = useCallback(() => {
    if (rafVisRef.current) cancelAnimationFrame(rafVisRef.current);
    rafVisRef.current = requestAnimationFrame(() => {
      rafVisRef.current = 0;
      const wm = workingRef.current;
      const ov = overlayRef.current;
      if (!wm || !ov) return;
      const ctx = ov.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, ov.width, ov.height);
      ctx.drawImage(wm.canvas, 0, 0, ov.width, ov.height);
    });
  }, []);

  const notifyMask = useCallback(() => {
    const has = maskHasPaint(workingRef.current);
    onMaskChange?.(has);
  }, [onMaskChange]);

  const pushHistory = useCallback(() => {
    const snap = snapshotMask(workingRef.current);
    if (!snap) return;
    historyRef.current.push(snap);
    if (historyRef.current.length > 30) historyRef.current.shift();
  }, []);

  /** Close radius in natural pixels — responsive to zoom/display scale. */
  const closeRadiusNatural = useCallback(() => {
    const el = containerRef.current;
    if (!el || !fitBox.w) return CLOSE_TOLERANCE_CSS_PX;
    const scale = (fitBox.w * zoomRef.current) / Math.max(1, natural.w);
    return CLOSE_TOLERANCE_CSS_PX / Math.max(0.05, scale);
  }, [fitBox.w, natural.w]);

  const recomputeFit = useCallback(() => {
    const el = containerRef.current;
    if (!el || !natural.w) return;
    const rect = el.getBoundingClientRect();
    const box = containSize(natural, rect.width, rect.height, 12);
    setFitBox(box);
  }, [natural]);

  useEffect(() => {
    if (!ready) return;
    recomputeFit();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recomputeFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, recomputeFit]);

  useEffect(() => {
    if (!ready || !overlayRef.current) return;
    const cssW = Math.max(1, Math.round((fitBox.w || 1) * zoomRef.current));
    const cssH = Math.max(1, Math.round((fitBox.h || 1) * zoomRef.current));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ov = overlayRef.current;
    ov.width = Math.max(1, Math.round(cssW * dpr));
    ov.height = Math.max(1, Math.round(cssH * dpr));
    ov.style.width = `${cssW}px`;
    ov.style.height = `${cssH}px`;
    scheduleMaskVis();
  }, [ready, zoom, pan, fitBox.w, fitBox.h, scheduleMaskVis]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    workingRef.current = null;
    historyRef.current = [];
    pathRef.current = [];
    setLivePath(null);
    setLiveStroke(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      setNatural({ w, h });
      workingRef.current = createWorkingMask(w, h);
      setReady(true);
      onMaskChange?.(false);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, onMaskChange]);

  const screenToSource = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const el = containerRef.current;
      if (!el || !fitBox.w || !natural.w) return null;
      const rect = el.getBoundingClientRect();
      const cssW = fitBox.w * zoomRef.current;
      const cssH = fitBox.h * zoomRef.current;
      const ox = (rect.width - cssW) / 2 + panRef.current.x;
      const oy = (rect.height - cssH) / 2 + panRef.current.y;
      const lx = clientX - rect.left - ox;
      const ly = clientY - rect.top - oy;
      if (lx < 0 || ly < 0 || lx > cssW || ly > cssH) return null;
      return {
        x: (lx / cssW) * natural.w,
        y: (ly / cssH) * natural.h,
      };
    },
    [fitBox.w, fitBox.h, natural.w, natural.h],
  );

  const applyBrush = useCallback(
    (from: Point | null, to: Point) => {
      const wm = workingRef.current;
      if (!wm) return;
      const erase = toolRef.current === "erase";
      const brush = makeBrush(brushSizeRef.current, erase);
      if (from) strokeBetween(wm, from, to, brush, erase);
      else stampBrush(wm, to, brush, erase);
      scheduleMaskVis();
    },
    [scheduleMaskVis],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.pointerType === "touch" && e.nativeEvent.isPrimary === false) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const pt = screenToSource(e.clientX, e.clientY);
      if (!pt) return;
      drawingRef.current = true;
      lastPtRef.current = pt;
      pathRef.current = [pt];
      pushHistory();
      if (toolRef.current === "circle") {
        setLivePath([pt]);
        setLiveStroke(null);
      } else {
        setLivePath(null);
        setLiveStroke({ pts: [pt], erase: toolRef.current === "erase" });
        applyBrush(null, pt);
      }
      setCursor(pt);
    },
    [disabled, screenToSource, pushHistory, applyBrush, scheduleMaskVis],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pt = screenToSource(e.clientX, e.clientY);
      if (pt) setCursor(pt);
      if (!drawingRef.current) return;
      if (!pt) return;
      const last = lastPtRef.current;
      if (last && distNatural(last, pt) < PATH_SAMPLE_NATURAL) return;
      pathRef.current.push(pt);
      lastPtRef.current = pt;
      if (toolRef.current === "circle") {
        setLivePath([...pathRef.current]);
      } else {
        applyBrush(last, pt);
        setLiveStroke((s) =>
          s ? { ...s, pts: [...s.pts, pt] } : { pts: [pt], erase: toolRef.current === "erase" },
        );
      }
    },
    [screenToSource, applyBrush],
  );

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = pathRef.current;
    pathRef.current = [];
    lastPtRef.current = null;
    setLivePath(null);
    setLiveStroke(null);
    if (toolRef.current === "circle") {
      const wm = workingRef.current;
      if (wm && pts.length >= MIN_PATH_POINTS && pathLengthNatural(pts) >= MIN_PATH_LENGTH_NATURAL) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        const closeR = closeRadiusNatural();
        if (distNatural(a, b) <= closeR) {
          fillClosedPath(wm, pts);
          scheduleMaskVis();
        }
      }
    }
    notifyMask();
  }, [closeRadiusNatural, scheduleMaskVis, notifyMask]);

  const onPointerUp = useCallback(() => {
    finishStroke();
  }, [finishStroke]);

  const onPointerCancel = useCallback(() => {
    if (toolRef.current === "circle") {
      pathRef.current = [];
      setLivePath(null);
    }
    drawingRef.current = false;
    lastPtRef.current = null;
    setLiveStroke(null);
  }, []);

  // Pinch zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchRef.current = {
          dist,
          zoom: zoomRef.current,
          cx: (a.clientX + b.clientX) / 2,
          cy: (a.clientY + b.clientY) / 2,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = dist / Math.max(1, pinchRef.current.dist);
        setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.zoom * ratio)));
      }
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ready]);

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => exportMaskNatural(workingRef.current),
      exportMaskStats: () => {
        const wm = workingRef.current;
        if (!wm || !maskHasPaint(wm)) return null;
        return computeMaskStats(wm);
      },
      clear: () => {
        clearWorkingMask(workingRef.current);
        historyRef.current = [];
        scheduleMaskVis();
        onMaskChange?.(false);
      },
      hasMask: () => maskHasPaint(workingRef.current),
      undo: () => {
        const prev = historyRef.current.pop();
        if (!prev) return;
        restoreSnapshot(workingRef.current, prev);
        scheduleMaskVis();
        notifyMask();
      },
      fit: () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      },
    }),
    [scheduleMaskVis, onMaskChange, notifyMask],
  );

  const cssW = Math.max(1, Math.round(fitBox.w * zoom));
  const cssH = Math.max(1, Math.round(fitBox.h * zoom));

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {ready && (
        <div
          className="relative"
          style={{
            width: cssW,
            height: cssH,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "fill", imageRendering: "auto" }}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 h-full w-full"
            style={{ mixBlendMode: "normal", opacity: 0.55, pointerEvents: "none" }}
          />
          {/* Live circle path preview */}
          {livePath && livePath.length > 1 && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${natural.w} ${natural.h}`}
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            >
              <polyline
                points={livePath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={`rgba(${BRAND}, 0.95)`}
                strokeWidth={Math.max(2, natural.w * 0.004)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {livePath[0] && (
                <circle
                  cx={livePath[0].x}
                  cy={livePath[0].y}
                  r={Math.max(4, natural.w * 0.008)}
                  fill={`rgba(${BRAND}, 0.9)`}
                />
              )}
            </svg>
          )}
          {/* Brush / Eraser live stroke — eraser is white dashed, never brand paint */}
          {liveStroke && liveStroke.pts.length > 0 && (
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${natural.w} ${natural.h}`}
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            >
              <polyline
                points={liveStroke.pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={liveStroke.erase ? "rgba(255,255,255,0.92)" : `rgba(${BRAND}, 0.85)`}
                strokeWidth={brushSize * (natural.w / Math.max(1, fitBox.w * zoom))}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={tool === "erase" ? "6 4" : undefined}
                opacity={0.9}
              />
            </svg>
          )}
          <div
            className="absolute inset-0"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            style={{
              pointerEvents: disabled ? "none" : "auto",
              cursor: tool === "erase" ? "cell" : tool === "brush" ? "crosshair" : "crosshair",
            }}
          />
        </div>
      )}
      {cursor && (tool === "brush" || tool === "erase") && !disabled && (
        <div
          className="pointer-events-none absolute rounded-full border-2"
          style={{
            width: brushSize,
            height: brushSize,
            left: "50%",
            top: "50%",
            marginLeft: -brushSize / 2,
            marginTop: -brushSize / 2,
            borderColor: tool === "erase" ? "rgba(255,255,255,0.9)" : `rgba(${BRAND}, 0.9)`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
            display: "none",
          }}
        />
      )}
      {/* Zoom controls — fully removed while generating (disabled), not merely greyed out */}
      {!disabled ? (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
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
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white/95 text-[10px] font-semibold shadow dark:border-white/15 dark:bg-[#1a1c24]/95"
          >
            Fit
          </button>
        </div>
      ) : null}
    </div>
  );
});
