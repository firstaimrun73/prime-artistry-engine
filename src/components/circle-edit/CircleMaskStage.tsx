/**
 * Circle 2edit mask stage — exports required by circle-remove route.
 * Canvas: aspect-ratio matched contain-fit (no fixed square / letterbox).
 * Circle tool: freehand A→B path with terminal markers + connecting flash/light.
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
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
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
  const [ready, setReady] = useState(false);
  const [aspect, setAspect] = useState<number | null>(null);
  const [livePath, setLivePath] = useState<Point[]>([]);
  const [nearClose, setNearClose] = useState(false);
  const [closeFlash, setCloseFlash] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

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

  const layoutCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    const img = imgRef.current;
    if (!canvas || !shell || !img) return;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const rect = shell.getBoundingClientRect();
    const boxW = Math.max(1, rect.width - 4);
    const boxH = Math.max(1, rect.height - 4);
    const { w, h, scale } = containSize(nw, nh, boxW, boxH);
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
  }, [redraw]);

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
      setAspect(natural.width / Math.max(1, natural.height));
      setReady(true);
      setLivePath([]);
      setNearClose(false);
      requestAnimationFrame(() => {
        layoutCanvas();
        notify();
      });
    };
    img.onerror = () => setReady(false);
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, layoutCanvas, notify]);

  useEffect(() => {
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

  useImperativeHandle(
    ref,
    () => ({
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
        setLivePath([]);
        setNearClose(false);
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
      fit: () => layoutCanvas(),
    }),
    [redraw, notify, pushHistory, layoutCanvas],
  );

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
      setLivePath([p]);
      setNearClose(false);
      setCloseFlash(false);
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

  const onPointerUp = () => {
    if (!drawingRef.current || !maskRef.current) return;
    drawingRef.current = false;
    const kind = toolKind(tool);
    if (kind === "path" && pathRef.current.length >= 3) {
      fillClosedPath(maskRef.current, pathRef.current);
      redraw();
      setCloseFlash(true);
      window.setTimeout(() => setCloseFlash(false), 420);
    }
    pathRef.current = [];
    lastPtRef.current = null;
    setLivePath([]);
    setNearClose(false);
    notify();
  };

  const nat = maskRef.current?.natural;
  const pathD = livePath.length > 0 ? smoothPathD(livePath) : "";
  const termA = livePath[0];
  const termB = livePath.length > 1 ? livePath[livePath.length - 1] : null;

  return (
    <div
      ref={shellRef}
      className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
      data-circle-mask-stage="true"
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
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {nat && livePath.length > 0 && displaySize.w > 0 ? (
          <svg
            className="pointer-events-none absolute inset-0"
            width={displaySize.w}
            height={displaySize.h}
            viewBox={`0 0 ${nat.width} ${nat.height}`}
            preserveAspectRatio="none"
            aria-hidden
            data-circle-terminals="true"
          >
            <defs>
              <linearGradient id="c2e-ab-flash" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={BRAND} stopOpacity="0.15" />
                <stop offset="50%" stopColor="#A89BFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor={BRAND} stopOpacity="0.15" />
              </linearGradient>
              <filter id="c2e-ab-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {pathD ? (
              <path
                d={pathD}
                fill="none"
                stroke="url(#c2e-ab-flash)"
                strokeWidth={nearClose ? 4.5 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#c2e-ab-glow)"
                opacity={nearClose ? 1 : 0.85}
              />
            ) : null}
            {termA ? (
              <g>
                <circle cx={termA.x} cy={termA.y} r={14} fill="none" stroke={BRAND} strokeWidth={2} opacity={0.9} />
                <circle cx={termA.x} cy={termA.y} r={5} fill={BRAND} />
                <text
                  x={termA.x}
                  y={termA.y - 18}
                  textAnchor="middle"
                  fill={BRAND}
                  fontSize={16}
                  fontWeight={700}
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  A
                </text>
              </g>
            ) : null}
            {termB ? (
              <g>
                <circle
                  cx={termB.x}
                  cy={termB.y}
                  r={nearClose ? 16 : 12}
                  fill="none"
                  stroke={nearClose ? "#A89BFF" : BRAND}
                  strokeWidth={nearClose ? 2.5 : 2}
                  opacity={0.95}
                >
                  {nearClose ? (
                    <animate attributeName="r" values="12;18;12" dur="0.6s" repeatCount="indefinite" />
                  ) : null}
                </circle>
                <circle cx={termB.x} cy={termB.y} r={5} fill={nearClose ? "#A89BFF" : BRAND} />
                <text
                  x={termB.x}
                  y={termB.y - 18}
                  textAnchor="middle"
                  fill={nearClose ? "#A89BFF" : BRAND}
                  fontSize={16}
                  fontWeight={700}
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  B
                </text>
              </g>
            ) : null}
            {closeFlash && termA ? (
              <circle cx={termA.x} cy={termA.y} r={8} fill="none" stroke="#A89BFF" strokeWidth={3} opacity={0.9}>
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
