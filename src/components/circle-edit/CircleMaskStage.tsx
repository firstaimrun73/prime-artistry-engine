/**
 * Circle 2edit — redesigned architecture (img + SVG + source mask).
 *
 * LAYER 1 — SOURCE IMAGE: <img> from original object URL (never canvas-downscaled).
 * LAYER 2 — INTERACTION: SVG live feedback (circle ellipse, brush stroke) +
 *            transparent canvas that only tints the *committed* mask (no photo).
 * LAYER 3 — REAL MASK: WorkingMask in naturalWidth × naturalHeight (or capped) space.
 *
 * Transform model: one parent translate(pan) + scale(zoom) wraps image + overlays.
 * All tools share screen → source via getBoundingClientRect of the hit layer.
 */

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
  fillEllipse,
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
const MIN_ELLIPSE = 6;
const BRAND = "123, 111, 224";

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

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const maskVisRef = useRef<HTMLCanvasElement>(null);

  const naturalRef = useRef<Size | null>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const toolRef = useRef(tool);
  const brushSizeRef = useRef(brushSize);

  const drawingRef = useRef(false);
  const lastSrcRef = useRef<Point | null>(null);
  const ellipseARef = useRef<Point | null>(null);
  const ellipseBRef = useRef<Point | null>(null);
  const strokePtsRef = useRef<Point[]>([]);

  const panningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number; midX?: number; midY?: number; panX?: number; panY?: number } | null>(null);

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
  const [liveEllipse, setLiveEllipse] = useState<{ ax: number; ay: number; bx: number; by: number } | null>(null);
  const [liveStroke, setLiveStroke] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [diag, setDiag] = useState<string>("");

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tmp = document.createElement("canvas");
    tmp.width = mask.width;
    tmp.height = mask.height;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(mask.canvas, 0, 0);
    tctx.globalCompositeOperation = "source-in";
    tctx.fillStyle = `rgba(${BRAND}, 0.5)`;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
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
      setLiveEllipse(null);
      setLiveStroke([]);
      setDiag(
        `src ${nat.width}×${nat.height} · dpr ${typeof window !== "undefined" ? window.devicePixelRatio : 1}`,
      );
      scheduleMaskVis();
    },
    [onMaskChange, scheduleMaskVis],
  );

  useEffect(() => {
    setReady(false);
    setNatural(null);
    naturalRef.current = null;
    maskRef.current = null;
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
    setLiveEllipse(null);
    setLiveStroke([]);
    scheduleMaskVis();
  }, [onMaskChange, pushHistory, scheduleMaskVis]);

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
        return;
      }
      if (e.button !== 0) return;
      if (pinchRef.current) return;
      const src = screenToSource(e.clientX, e.clientY);
      if (!src) return;
      hit.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastSrcRef.current = src;
      if (toolRef.current === "circle") {
        ellipseARef.current = src;
        ellipseBRef.current = src;
        setLiveEllipse({ ax: src.x, ay: src.y, bx: src.x, by: src.y });
        setLiveStroke([]);
        return;
      }
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
      const src = screenToSource(e.clientX, e.clientY);
      if (!src) return;
      if (toolRef.current === "circle") {
        const a = ellipseARef.current;
        if (a) {
          ellipseBRef.current = src;
          setLiveEllipse({ ax: a.x, ay: a.y, bx: src.x, by: src.y });
        }
        return;
      }
      strokePtsRef.current.push(src);
      pendingStrokeRef.current = strokePtsRef.current;
      if (liveStrokeRafRef.current == null) {
        liveStrokeRafRef.current = requestAnimationFrame(() => {
          liveStrokeRafRef.current = null;
          if (pendingStrokeRef.current) setLiveStroke(pendingStrokeRef.current.slice());
        });
      }
      applyBrush(src, lastSrcRef.current);
      lastSrcRef.current = src;
      scheduleMaskVis();
    },
    [screenToSource, applyBrush, scheduleMaskVis],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent) => {
      if (panningRef.current) {
        panningRef.current = false;
        panStartRef.current = null;
        return;
      }
      if (!drawingRef.current) return;
      drawingRef.current = false;
      if (toolRef.current === "circle") {
        const a = ellipseARef.current;
        const b = ellipseBRef.current ?? screenToSource(e.clientX, e.clientY);
        const mask = maskRef.current;
        if (mask && a && b) {
          if (Math.abs(b.x - a.x) >= MIN_ELLIPSE || Math.abs(b.y - a.y) >= MIN_ELLIPSE) {
            pushHistory();
            fillEllipse(mask, a, b);
            hasMarkRef.current = maskHasPaint(mask);
            onMaskChange?.(hasMarkRef.current);
            scheduleMaskVis();
          }
        }
        ellipseARef.current = null;
        ellipseBRef.current = null;
        setLiveEllipse(null);
      } else {
        setLiveStroke([]);
        strokePtsRef.current = [];
        scheduleMaskVis();
      }
      lastSrcRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [screenToSource, pushHistory, onMaskChange, scheduleMaskVis],
  );

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
  }, []);

  let ellipseSvg: { cx: number; cy: number; rx: number; ry: number } | null = null;
  if (liveEllipse) {
    ellipseSvg = {
      cx: (liveEllipse.ax + liveEllipse.bx) / 2,
      cy: (liveEllipse.ay + liveEllipse.by) / 2,
      rx: Math.abs(liveEllipse.bx - liveEllipse.ax) / 2,
      ry: Math.abs(liveEllipse.by - liveEllipse.ay) / 2,
    };
  }

  const strokeD =
    liveStroke.length > 1
      ? liveStroke.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : "";

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
            {ellipseSvg && ellipseSvg.rx > 0 && ellipseSvg.ry > 0 && (
              <ellipse
                cx={ellipseSvg.cx}
                cy={ellipseSvg.cy}
                rx={Math.max(ellipseSvg.rx, 1)}
                ry={Math.max(ellipseSvg.ry, 1)}
                fill={`rgba(${BRAND}, 0.28)`}
                stroke={`rgba(${BRAND}, 0.95)`}
                strokeWidth={Math.max(2, natural.width / fitBox.w)}
                strokeDasharray={`${Math.max(4, natural.width / fitBox.w) * 3} ${Math.max(4, natural.width / fitBox.w) * 2}`}
              />
            )}
            {strokeD && (
              <path
                d={strokeD}
                fill="none"
                stroke={`rgba(${BRAND}, 0.55)`}
                strokeWidth={Math.max(2, brushSize / Math.max(screenToNaturalScale(), 0.001))}
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
            borderColor: tool === "erase" ? "rgba(255,255,255,0.95)" : `rgba(${BRAND}, 0.95)`,
            background: tool === "erase" ? "rgba(255,255,255,0.15)" : `rgba(${BRAND}, 0.22)`,
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

      {import.meta.env.DEV && diag && (
        <p className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/90">
          {diag}
          {fitBox.w > 0
            ? ` · view ${Math.round(fitBox.w * zoom)}×${Math.round(fitBox.h * zoom)} · z${zoom.toFixed(2)}`
            : ""}
        </p>
      )}
    </div>
  );
});
