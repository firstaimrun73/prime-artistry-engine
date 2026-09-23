/**
 * Circle 2edit mask stage — exports required by circle-remove route.
 * Canvas: aspect-ratio matched contain-fit (no fixed square / letterbox).
 * Circle tool: freehand A→B path with terminal markers + connecting flash/light.
 * Stage fills maximum available space (header/toolbar reserved by parent shell).
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

const BRAND = "#7B6FE0";
const CLOSE_TOLERANCE_NATURAL = 28;
const MIN_PATH_POINTS = 4;

function toolKind(tool: MaskTool): "brush" | "erase" | "path" {
  if (tool === "eraser" || tool === "erase") return "erase";
  if (tool === "brush") return "brush";
  return "path";
}

function containSize(nw: number, nh: number, boxW: number, boxH: number): { w: number; h: number; scale: number } {
  if (nw <= 0 || nh <= 0 || boxW <= 0 || boxH <= 0) {
    return { w: Math.max(1, boxW), h: Math.max(1, boxH), scale: 1 };
  }
  const scale = Math.min(boxW / nw, boxH / nh);
  return {
    w: Math.max(1, Math.round(nw * scale)),
    h: Math.max(1, Math.round(nh * scale)),
    scale,
  };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function smoothPathD(pts: Point[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    d += ` Q${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export const CircleMaskStage = forwardRef<CircleMaskStageHandle, Props>(function CircleMaskStage(
  { imageUrl, tool, brushSize, disabled, onMaskChange, inkColor = "purple", onHistoryChange },
  ref,
) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const historyRef = useRef<{ past: ImageData[]; future: ImageData[] }>({ past: [], future: [] });
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const pathRef = useRef<Point[]>([]);
  const dispScaleRef = useRef(1);
  const flashTimerRef = useRef<number | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [natural, setNatural] = useState<Size | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [livePath, setLivePath] = useState<Point[]>([]);
  const [nearClose, setNearClose] = useState(false);
  const [flashOrigin, setFlashOrigin] = useState<Point | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [userZoom, setUserZoom] = useState(1);
  const [touchRipple, setTouchRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const settings = (): BrushSettings => ({
    sizePx: brushSize,
    opacity: 100,
    hardness: 80,
    featherPx: 2,
  });

  const inkStroke = inkColor === "white" ? "#FFFFFF" : inkColor === "black" ? "#111111" : BRAND;

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
    // Tint mask overlay with active ink colour (persists across tools/undo)
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.drawImage(mask.canvas, 0, 0, w, h);
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = inkStroke;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }, [inkStroke]);

  const layoutCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    const img = imgRef.current;
    if (!canvas || !shell || !img) return;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const rect = shell.getBoundingClientRect();
    // Full stage bounds — no inset pad so 9:16 maximizes vertical space.
    // Add and Remove share this geometry for identical size on the same image.
    const boxW = Math.max(1, rect.width);
    const boxH = Math.max(1, rect.height);
    const { w: baseW, h: baseH, scale: baseScale } = containSize(nw, nh, boxW, boxH);
    const z = Math.min(3, Math.max(0.5, userZoom));
    const w = Math.max(1, Math.round(baseW * z));
    const h = Math.max(1, Math.round(baseH * z));
    const scale = baseScale * z;
    const maxEdge = 1440;
    const resScale = Math.min(1, maxEdge / Math.max(nw, nh));
    const bufW = Math.max(1, Math.round(nw * resScale));
    const bufH = Math.max(1, Math.round(nh * resScale));
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width = bufW;
      canvas.height = bufH;
    }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    dispScaleRef.current = scale;
    setDisplaySize({ w, h });
    redraw();
  }, [redraw, userZoom]);

  useEffect(() => {
    let cancelled = false;
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      const nat: Size = { width: img.naturalWidth, height: img.naturalHeight };
      maskRef.current = createWorkingMask(nat);
      historyRef.current = { past: [], future: [] };
      setNatural(nat);
      setAspect(nat.width / Math.max(1, nat.height));
      setReady(true);
      setLivePath([]);
      setNearClose(false);
      setFlashOrigin(null);
      setUserZoom(1);
      requestAnimationFrame(() => {
        layoutCanvas();
        notify();
      });
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, layoutCanvas, notify]);

  useEffect(() => {
    if (!ready) return;
    const shell = shellRef.current;
    if (!shell) return;
    const ro = new ResizeObserver(() => layoutCanvas());
    ro.observe(shell);
    window.addEventListener("resize", layoutCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", layoutCanvas);
    };
  }, [layoutCanvas, ready]);

  useEffect(() => {
    redraw();
  }, [inkStroke, redraw]);

  const toNatural = (e: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
    const y = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || !maskRef.current) return;
    // Single-finger / single-pointer only — ignore additional simultaneous touches
    if (activePointerRef.current != null && e.pointerId !== activePointerRef.current) return;
    if (e.pointerType === "touch" && (e as unknown as { isPrimary?: boolean }).isPrimary === false) return;
    activePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toNatural(e);
    if (!p) return;
    drawingRef.current = true;
    pushHistory();
    const kind = toolKind(tool);
    // Glass ripple at touch point (display coords)
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setTouchRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        id: Date.now(),
      });
      window.setTimeout(() => setTouchRipple(null), 420);
    }
    if (kind === "path") {
      pathRef.current = [p];
      setLivePath([p]);
      setNearClose(false);
    } else {
      stampBrush(maskRef.current, p, kind, settings(), dispScaleRef.current);
      lastPtRef.current = p;
      redraw();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !maskRef.current) return;
    if (activePointerRef.current != null && e.pointerId !== activePointerRef.current) return;
    const p = toNatural(e);
    if (!p) return;
    const kind = toolKind(tool);
    if (kind === "path") {
      const pts = pathRef.current;
      const last = pts[pts.length - 1];
      if (!last || dist(last, p) >= 2.5) pts.push(p);
      else pts[pts.length - 1] = p;
      pathRef.current = pts;
      setLivePath(pts.slice());
      const start = pts[0];
      const near = pts.length >= MIN_PATH_POINTS && dist(p, start) <= CLOSE_TOLERANCE_NATURAL;
      setNearClose(near);
    } else if (lastPtRef.current) {
      strokeBetween(maskRef.current, lastPtRef.current, p, kind, settings(), dispScaleRef.current);
      lastPtRef.current = p;
      redraw();
    }
  };

  const onPointerUp = (e?: React.PointerEvent) => {
    if (e && activePointerRef.current != null && e.pointerId !== activePointerRef.current) return;
    if (!drawingRef.current || !maskRef.current) {
      activePointerRef.current = null;
      return;
    }
    drawingRef.current = false;
    activePointerRef.current = null;
    const kind = toolKind(tool);
    if (kind === "path" && pathRef.current.length >= 3) {
      const origin = pathRef.current[0];
      fillClosedPath(maskRef.current, pathRef.current);
      redraw();
      setFlashOrigin(origin);
      if (flashTimerRef.current != null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        setFlashOrigin(null);
        flashTimerRef.current = null;
      }, 450);
    }
    pathRef.current = [];
    setLivePath([]);
    setNearClose(false);
    lastPtRef.current = null;
    notify();
  };

  useImperativeHandle(
    ref,
    () => ({
      exportMask: () => {
        const m = maskRef.current;
        const img = imgRef.current;
        if (!m || !img) return null;
        return exportMaskNatural(m, { width: img.naturalWidth, height: img.naturalHeight });
      },
      exportMaskStats: () => {
        const m = maskRef.current;
        if (!m) return null;
        return computeMaskStats(m);
      },
      clear: () => {
        if (!maskRef.current) return;
        pushHistory();
        clearWorkingMask(maskRef.current);
        redraw();
        notify();
      },
      hasMask: () => !!maskRef.current && maskHasPaint(maskRef.current),
      undo: () => {
        const m = maskRef.current;
        if (!m) return;
        const snap = historyRef.current.past.pop();
        if (!snap) return;
        const cur = snapshotMask(m);
        if (cur) historyRef.current.future.push(cur);
        restoreSnapshot(m, snap);
        redraw();
        notify();
      },
      redo: () => {
        const m = maskRef.current;
        if (!m) return;
        const snap = historyRef.current.future.pop();
        if (!snap) return;
        const cur = snapshotMask(m);
        if (cur) historyRef.current.past.push(cur);
        restoreSnapshot(m, snap);
        redraw();
        notify();
      },
      canUndo: () => historyRef.current.past.length > 0,
      canRedo: () => historyRef.current.future.length > 0,
      fit: () => {
        setUserZoom(1);
        requestAnimationFrame(() => layoutCanvas());
      },
    }),
    [redraw, notify, pushHistory, layoutCanvas],
  );

  const termA = livePath[0];
  const termB = livePath.length > 1 ? livePath[livePath.length - 1] : null;
  const showOverlay =
    !!natural && displaySize.w > 0 && (livePath.length > 0 || flashOrigin != null);

  // Overlay is in display pixels; path points are natural — scale for SVG
  const toDisp = (p: Point): Point => {
    const img = imgRef.current;
    if (!img || !displaySize.w) return p;
    return {
      x: (p.x / img.naturalWidth) * displaySize.w,
      y: (p.y / img.naturalHeight) * displaySize.h,
    };
  };
  const dispPath = livePath.map(toDisp);
  const dispA = termA ? toDisp(termA) : null;
  const dispB = termB ? toDisp(termB) : null;
  const dispFlash = flashOrigin ? toDisp(flashOrigin) : null;
  const RING_SW = 3.25; // thicker premium ring (was ~2)

  return (
    <div
      ref={shellRef}
      className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
      data-circle-mask-stage="true"
      data-circle-canvas-fill="max"
      style={aspect ? { ["--circle-img-aspect" as string]: String(aspect) } : undefined}
    >
      <div className="relative" style={{ width: displaySize.w || undefined, height: displaySize.h || undefined }}>
        <canvas
          ref={canvasRef}
          className="touch-none"
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: displaySize.w ? `${displaySize.w}px` : "auto",
            height: displaySize.h ? `${displaySize.h}px` : "auto",
            objectFit: "contain",
            imageRendering: "auto",
            aspectRatio: aspect ? String(aspect) : undefined,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => onPointerUp(e)}
          onPointerCancel={(e) => onPointerUp(e)}
        />
        {/* Zoom controls */}
        <div className="absolute bottom-2 right-2 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setUserZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-black/50 text-sm font-bold text-white backdrop-blur-md"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setUserZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-black/50 text-sm font-bold text-white backdrop-blur-md"
          >
            −
          </button>
        </div>
        {/* Glass touch ripple */}
        {touchRipple ? (
          <span
            key={touchRipple.id}
            className="pointer-events-none absolute z-10 rounded-full"
            style={{
              left: touchRipple.x,
              top: touchRipple.y,
              width: 48,
              height: 48,
              marginLeft: -24,
              marginTop: -24,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(123,111,224,0.22) 40%, transparent 70%)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 0 20px rgba(123,111,224,0.25)",
              animation: "c2e-glass-ripple 0.42s ease-out forwards",
            }}
          />
        ) : null}
        <style>{`@keyframes c2e-glass-ripple{0%{transform:scale(0.35);opacity:0.9}100%{transform:scale(1.35);opacity:0}}`}</style>
        {showOverlay ? (
          <svg
            className="pointer-events-none absolute inset-0"
            width={displaySize.w}
            height={displaySize.h}
            viewBox={`0 0 ${displaySize.w} ${displaySize.h}`}
          >
            <defs>
              <linearGradient id="c2e-ab-flash" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={inkStroke} stopOpacity="0.15" />
                <stop offset="50%" stopColor="#A89BFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor={inkStroke} stopOpacity="0.15" />
              </linearGradient>
              <filter id="c2e-ab-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {dispPath.length > 1 ? (
              <path
                d={smoothPathD(dispPath)}
                fill="none"
                stroke="url(#c2e-ab-flash)"
                strokeWidth={RING_SW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#c2e-ab-glow)"
                opacity={nearClose ? 1 : 0.85}
              />
            ) : null}
            {dispA ? (
              <g>
                <circle cx={dispA.x} cy={dispA.y} r={14} fill="none" stroke={inkStroke} strokeWidth={RING_SW} opacity={0.9} />
                <circle cx={dispA.x} cy={dispA.y} r={5} fill={inkStroke} />
              </g>
            ) : null}
            {dispB ? (
              <g>
                <circle
                  cx={dispB.x}
                  cy={dispB.y}
                  r={nearClose ? 16 : 12}
                  fill="none"
                  stroke={nearClose ? "#A89BFF" : inkStroke}
                  strokeWidth={nearClose ? RING_SW + 0.5 : RING_SW}
                  opacity={0.95}
                >
                  {nearClose ? (
                    <animate attributeName="r" values="12;18;12" dur="0.6s" repeatCount="indefinite" />
                  ) : null}
                </circle>
                <circle cx={dispB.x} cy={dispB.y} r={5} fill={nearClose ? "#A89BFF" : inkStroke} />
              </g>
            ) : null}
            {dispFlash ? (
              <circle cx={dispFlash.x} cy={dispFlash.y} r={8} fill="none" stroke="#A89BFF" strokeWidth={3} opacity={0.9}>
                <animate attributeName="r" from="8" to="48" dur="0.4s" fill="freeze" />
                <animate attributeName="opacity" from="0.9" to="0" dur="0.4s" fill="freeze" />
              </circle>
            ) : null}
          </svg>
        ) : null}
      </div>
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Loading…</div>
      )}
    </div>
  );
});

export default CircleMaskStage;
