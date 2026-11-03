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
  const userZoomRef = useRef(1);
  userZoomRef.current = userZoom;
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
    const tint = document.createElement("canvas");
    tint.width = w;
    tint.height = h;
    const tctx = tint.getContext("2d");
    if (tctx) {
      tctx.fillStyle = inkStroke;
      tctx.fillRect(0, 0, w, h);
      tctx.globalCompositeOperation = "destination-in";
      tctx.drawImage(mask.canvas, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(tint, 0, 0);
      ctx.restore();
    }
  }, [inkStroke]);

  const layoutCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    const img = imgRef.current;
    if (!canvas || !shell || !img) return;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const rect = shell.getBoundingClientRect();
    const boxW = Math.max(1, rect.width);
    const boxH = Math.max(1, rect.height);
    const { w: baseW, h: baseH, scale: baseScale } = containSize(nw, nh, boxW, boxH);
    const z = Math.min(3, Math.max(0.5, userZoomRef.current));
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
  }, [redraw]);

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
  }, [imageUrl]);

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
    if (!ready) return;
    layoutCanvas();
  }, [userZoom, ready, layoutCanvas]);

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
    if (activePointerRef.current != null && e.pointerId !== activePointerRef.current) return;
    if (e.pointerType === "touch" && (e as unknown as { isPrimary?: boolean }).isPrimary === false) return;
    activePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toNatural(e);
    if (!p) return;
    drawingRef.current = true;
    pushHistory();
    const kind = toolKind(tool);
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
      setLivePath([p];
      setNearClose(false);
    } else {
      stampBrush(maskRef.current, p, kind, settings(), dispScaleRef.current);
      lastPtRef.current = p;
      redraw();
    }
  };
