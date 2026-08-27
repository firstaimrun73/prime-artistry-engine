// Professional masking system for "Circle to Remove".
// Interim restore while Mask Engine integration completes.
// Produces hard B/W mask PNG via onApply(maskDataUrl) at natural resolution.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  X, Eraser, Check, Brush, ZoomIn, ZoomOut, Undo2, Redo2, Move, EyeOff, Eye,
  FlipHorizontal2, RotateCcw, Circle,
} from "lucide-react";
import type { MaskTool, BrushSettings, Point, Size } from "@/components/circle-edit/mask/types";
import { clientToNatural, computeContainScale } from "@/components/circle-edit/mask/maskGeometry";
import {
  createWorkingMask, stampBrush, strokeBetween, fillEllipse,
  clearMask as clearWorkingMask, invertMask as invertWorkingMask,
  maskHasPaint, exportMaskNatural, snapshotMask, restoreSnapshot,
  type WorkingMask,
} from "@/components/circle-edit/mask/maskCanvas";

type Props = {
  open: boolean;
  imageUrl: string | null;
  onCancel: () => void;
  onApply: (maskDataUrl: string) => void;
  initialTool?: MaskTool;
};

export const SMART_REMOVE_PROMPT =
  "Remove only the masked area completely. Reconstruct it naturally using the surrounding textures, lighting, shadows, reflections and perspective so the result looks like the object was never there. Keep every unmasked pixel identical.";

const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4, 8];
const MAX_HISTORY = 30;

export function SmartRemoveModal({
  open, imageUrl, onCancel, onApply, initialTool = "circle",
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<WorkingMask | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const circleStartRef = useRef<Point | null>(null);
  const circleLiveRef = useRef<{ cx: number; cy: number; rx: number; ry: number } | null>(null);
  const panningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const spaceDownRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const hasMarkRef = useRef(false);
  const naturalRef = useRef<Size | null>(null);
  const applyInFlightRef = useRef(false);
  const liveRef = useRef({
    tool: initialTool as MaskTool, brush: 40, opacity: 100, hardness: 80,
    feather: 2, displayScale: 1, showMask: true, overlayOpacity: 55,
  });

  const [tool, setTool] = useState<MaskTool>(initialTool);
  const [brush, setBrush] = useState(40);
  const [opacity, setOpacity] = useState(100);
  const [hardness, setHardness] = useState(80);
  const [feather, setFeather] = useState(2);
  const [overlayOpacity, setOverlayOpacity] = useState(55);
  const [showMask, setShowMask] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [hasMark, setHasMark] = useState(false);
  const [applying, setApplying] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [emptyError, setEmptyError] = useState(false);
  const isMobile = useIsMobile();
  const maxBrush = isMobile ? 80 : 100;

  useEffect(() => { setBrush((b) => Math.min(b, maxBrush)); }, [maxBrush]);

  const [winSize, setWinSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) {
      setReady(false); hasMarkRef.current = false; setHasMark(false); setApplying(false);
      setZoom(1); setOffset({ x: 0, y: 0 }); historyRef.current = []; historyIndexRef.current = -1;
      setCanUndo(false); setCanRedo(false); circleStartRef.current = null; circleLiveRef.current = null;
      maskRef.current = null; naturalRef.current = null; setCursorPos(null); setEmptyError(false);
      applyInFlightRef.current = false;
    } else setTool(initialTool);
  }, [open, initialTool]);

  useEffect(() => {
    liveRef.current = { ...liveRef.current, tool, brush, opacity, hardness, feather, showMask, overlayOpacity };
  }, [tool, brush, opacity, hardness, feather, showMask, overlayOpacity]);

  const fitScale = useMemo(() => {
    const vp = viewportRef.current; const n = naturalRef.current;
    if (!vp || !n) return 1;
    return computeContainScale(n, vp.clientWidth, vp.clientHeight, 12);
  }, [ready, open, winSize.w, winSize.h, isMobile]);

  const displayScale = fitScale * zoom;
  liveRef.current.displayScale = displayScale;

  const brushSettings = useCallback((): BrushSettings => {
    const L = liveRef.current;
    return { sizePx: L.brush, opacity: L.opacity, hardness: L.hardness, featherPx: L.feather };
  }, []);

  const pushHistory = useCallback(() => {
    const m = maskRef.current; if (!m) return;
    const snap = snapshotMask(m); if (!snap) return;
    const arr = historyRef.current.slice(0, historyIndexRef.current + 1);
    arr.push(snap);
    if (arr.length > MAX_HISTORY) arr.shift();
    historyRef.current = arr; historyIndexRef.current = arr.length - 1;
    setCanUndo(historyIndexRef.current > 0); setCanRedo(false);
  }, []);

  const paintView = useCallback(() => {
    const view = viewCanvasRef.current; const img = imgRef.current;
    const m = maskRef.current; const n = naturalRef.current;
    if (!view || !img || !m || !n) return;
    const w = Math.max(1, Math.round(n.width * displayScale));
    const h = Math.max(1, Math.round(n.height * displayScale));
    if (view.width !== w) view.width = w;
    if (view.height !== h) view.height = h;
    const ctx = view.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    if (liveRef.current.showMask) {
      const tint = document.createElement("canvas");
      tint.width = m.width; tint.height = m.height;
      const tctx = tint.getContext("2d");
      if (tctx) {
        tctx.drawImage(m.canvas, 0, 0);
        tctx.globalCompositeOperation = "source-in";
        tctx.fillStyle = "rgba(239, 68, 68, 1)";
        tctx.fillRect(0, 0, tint.width, tint.height);
        ctx.globalAlpha = liveRef.current.overlayOpacity / 100;
        ctx.drawImage(tint, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }
    const live = circleLiveRef.current;
    if (live && liveRef.current.tool === "circle") {
      const sx = displayScale;
      ctx.save();
      ctx.strokeStyle = "rgba(168,155,255,0.95)"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(live.cx * sx, live.cy * sx, Math.max(1, live.rx * sx), Math.max(1, live.ry * sx), 0, 0, Math.PI * 2);
      ctx.stroke(); ctx.fillStyle = "rgba(168,155,255,0.28)"; ctx.fill(); ctx.restore();
    }
  }, [displayScale]);

  const requestPaint = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; paintView(); });
  }, [paintView]);

  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);

  const onImageLoad = () => {
    const img = imgRef.current; if (!img || !img.naturalWidth) return;
    const natural: Size = { width: img.naturalWidth, height: img.naturalHeight };
    naturalRef.current = natural;
    maskRef.current = createWorkingMask(natural);
    setReady(true); hasMarkRef.current = false; setHasMark(false);
    historyRef.current = []; historyIndexRef.current = -1;
    setTimeout(() => { pushHistory(); paintView(); }, 0);
  };

  useEffect(() => { if (ready) paintView(); }, [ready, paintView]);
  useEffect(() => {
    if (!open) return;
    const onResize = () => paintView();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, paintView]);

  const pointFromClient = (clientX: number, clientY: number): Point => {
    const view = viewCanvasRef.current; const n = naturalRef.current;
    if (!view || !n) return { x: 0, y: 0 };
    return clientToNatural(clientX, clientY, view.getBoundingClientRect(), n);
  };

  const markPainted = () => {
    if (!hasMarkRef.current) { hasMarkRef.current = true; setHasMark(true); setEmptyError(false); }
  };

  const beginStroke = (clientX: number, clientY: number) => {
    const p = pointFromClient(clientX, clientY); const L = liveRef.current;
    if (L.tool === "circle") {
      circleStartRef.current = p;
      circleLiveRef.current = { cx: p.x, cy: p.y, rx: 0, ry: 0 };
      requestPaint(); return;
    }
    lastPtRef.current = p;
    const m = maskRef.current;
    if (m) {
      stampBrush(m, p, L.tool === "erase" ? "erase" : "brush", brushSettings(), L.displayScale);
      markPainted(); requestPaint();
    }
  };

  const continueStroke = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const p = pointFromClient(clientX, clientY); const L = liveRef.current;
    if (L.tool === "circle" && circleStartRef.current) {
      const s = circleStartRef.current;
      circleLiveRef.current = { cx: (s.x + p.x) / 2, cy: (s.y + p.y) / 2, rx: Math.abs(p.x - s.x) / 2, ry: Math.abs(p.y - s.y) / 2 };
      requestPaint(); return;
    }
    const m = maskRef.current; if (!m) return;
    const prev = lastPtRef.current ?? p;
    strokeBetween(m, prev, p, L.tool === "erase" ? "erase" : "brush", brushSettings(), L.displayScale);
    markPainted(); lastPtRef.current = p; requestPaint();
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false; const L = liveRef.current;
    if (L.tool === "circle" && circleLiveRef.current && circleLiveRef.current.rx > 2 && circleLiveRef.current.ry > 2) {
      const c = circleLiveRef.current; const m = maskRef.current;
      if (m) {
        fillEllipse(m, { x: c.cx - c.rx, y: c.cy - c.ry }, { x: c.cx + c.rx, y: c.cy + c.ry });
        markPainted();
      }
      circleStartRef.current = null; circleLiveRef.current = null; pushHistory(); requestPaint(); return;
    }
    circleStartRef.current = null; circleLiveRef.current = null; lastPtRef.current = null;
    if (L.tool !== "circle") pushHistory();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (applying || applyInFlightRef.current) return;
    e.preventDefault();
    if (spaceDownRef.current || e.button === 1) {
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); return;
    }
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true; beginStroke(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (applying) return;
    const vp = viewportRef.current;
    if (vp) {
      const r = vp.getBoundingClientRect();
      setCursorPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
    if (panningRef.current && panStartRef.current) {
      setOffset({ x: panStartRef.current.ox + (e.clientX - panStartRef.current.x), y: panStartRef.current.oy + (e.clientY - panStartRef.current.y) });
      return;
    }
    continueStroke(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch { /* */ }
    if (panningRef.current) { panningRef.current = false; panStartRef.current = null; return; }
    endStroke();
  };

  useEffect(() => {
    if (!open) return;
    const el = viewportRef.current; if (!el) return;
    const prevent = (ev: TouchEvent) => { if (ev.cancelable) ev.preventDefault(); };
    el.addEventListener("touchstart", prevent, { passive: false });
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => { el.removeEventListener("touchstart", prevent); el.removeEventListener("touchmove", prevent); };
  }, [open, ready]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) setZoom((z) => Math.max(0.25, Math.min(8, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    else setBrush((b) => Math.max(4, Math.min(maxBrush, b + (e.deltaY < 0 ? 2 : -2))));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { spaceDownRef.current = true; e.preventDefault(); return; }
      if (e.key === "[") setBrush((b) => Math.max(4, b - 2));
      if (e.key === "]") setBrush((b) => Math.min(maxBrush, b + 2));
      if (e.key.toLowerCase() === "b") setTool("brush");
      if (e.key.toLowerCase() === "e") setTool("erase");
      if (e.key.toLowerCase() === "c") setTool("circle");
      if (e.key.toLowerCase() === "m") setShowMask((v) => !v);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") spaceDownRef.current = false; };
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, maxBrush]);

  const restoreSnap = (snap: ImageData) => {
    const m = maskRef.current; if (!m) return;
    restoreSnapshot(m, snap); paintView();
    const any = maskHasPaint(m); hasMarkRef.current = any; setHasMark(any);
  };
  const undo = () => {
    const idx = historyIndexRef.current; if (idx <= 0) return;
    historyIndexRef.current = idx - 1; restoreSnap(historyRef.current[historyIndexRef.current]);
    setCanUndo(historyIndexRef.current > 0); setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };
  const redo = () => {
    const idx = historyIndexRef.current; if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1; restoreSnap(historyRef.current[historyIndexRef.current]);
    setCanUndo(historyIndexRef.current > 0); setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };
  const clearMask = () => {
    const m = maskRef.current; if (!m) return;
    clearWorkingMask(m); paintView(); hasMarkRef.current = false; setHasMark(false); setEmptyError(false); pushHistory();
  };
  const invertMask = () => {
    const m = maskRef.current; if (!m) return;
    invertWorkingMask(m); paintView(); setHasMark(true); hasMarkRef.current = true; pushHistory();
  };
  const stepZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.findIndex((v) => Math.abs(v - zoom) < 0.001);
    if (i === -1) {
      let nearest = 0;
      for (let k = 0; k < ZOOM_STEPS.length; k++) if (Math.abs(ZOOM_STEPS[k] - zoom) < Math.abs(ZOOM_STEPS[nearest] - zoom)) nearest = k;
      setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, nearest + dir))]);
    } else setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir))]);
  };

  const apply = async () => {
    const m = maskRef.current;
    if (!m || applyInFlightRef.current) return;
    if (!hasMarkRef.current || !maskHasPaint(m)) { setEmptyError(true); setHasMark(false); return; }
    applyInFlightRef.current = true; setApplying(true); setEmptyError(false);
    try {
      const dataUrl = exportMaskNatural(m);
      if (!dataUrl) { setEmptyError(true); setHasMark(false); return; }
      onApply(dataUrl);
    } catch (e) {
      console.error("[mask-engine] apply failed:", e); setApplying(false);
    } finally {
      applyInFlightRef.current = false;
      window.setTimeout(() => setApplying(false), 400);
    }
  };

  if (!open || !imageUrl) return null;
  const n = naturalRef.current;
  const dispW = n ? Math.round(n.width * displayScale) : 0;
  const dispH = n ? Math.round(n.height * displayScale) : 0;
  const cursorDiameter = brush;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85" role="dialog" aria-modal="true">
      {!isMobile && (
        <div className="flex items-center justify-between border-b border-white/10 bg-background/95 px-4 py-3">
          <div>
            <h2 className="text-base font-bold">Circle 2edit — Mark area</h2>
            <p className="text-xs text-muted-foreground">Circle · Brush · Eraser · Space = pan · [/] = size · Ctrl+Z undo</p>
          </div>
          <button onClick={onCancel} className="rounded-md p-2 text-muted-foreground hover:bg-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
      )}
      {!isMobile && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-background/95 px-4 py-2 text-xs">
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button onClick={() => setTool("circle")} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 ${tool === "circle" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><Circle className="h-3.5 w-3.5" /> Circle</button>
            <button onClick={() => setTool("brush")} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 ${tool === "brush" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><Brush className="h-3.5 w-3.5" /> Brush</button>
            <button onClick={() => setTool("erase")} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 ${tool === "erase" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><Eraser className="h-3.5 w-3.5" /> Erase</button>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border px-1">
            <button onClick={() => stepZoom(-1)} className="p-1.5 hover:bg-secondary" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
            <span className="tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => stepZoom(1)} className="p-1.5 hover:bg-secondary" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary"><Move className="h-3.5 w-3.5" /> Fit</button>
          <button onClick={undo} disabled={!canUndo} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
          <button onClick={redo} disabled={!canRedo} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40"><Redo2 className="h-3.5 w-3.5" /> Redo</button>
          <button onClick={invertMask} disabled={!hasMark} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40"><FlipHorizontal2 className="h-3.5 w-3.5" /> Invert</button>
          <button onClick={clearMask} disabled={!hasMark} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Clear</button>
          <button onClick={() => setShowMask((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary">{showMask ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{showMask ? " Hide" : " Show"}</button>
        </div>
      )}
      <div ref={viewportRef} className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_60%)]" style={{ touchAction: "none" }}>
        <img ref={imgRef} src={imageUrl} onLoad={onImageLoad} alt="" className="hidden" crossOrigin={imageUrl.startsWith("http") ? "anonymous" : undefined} />
        {ready && n && (
          <div className="absolute" style={{ left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)`, transform: "translate(-50%, -50%)", width: dispW, height: dispH }}>
            <canvas ref={viewCanvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={() => { if (!drawingRef.current) setCursorPos(null); }} onWheel={onWheel}
              className="block h-full w-full"
              style={{ cursor: tool === "brush" || tool === "erase" ? "none" : panningRef.current || spaceDownRef.current ? "grabbing" : "crosshair", touchAction: "none", pointerEvents: applying ? "none" : "auto" }} />
            {applying && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-primary" /><p className="text-sm font-semibold text-white">Preparing mask…</p></div>}
          </div>
        )}
        {cursorPos && (tool === "brush" || tool === "erase") && !applying && (
          <div className="pointer-events-none absolute z-10 rounded-full border-2" style={{ left: cursorPos.x - cursorDiameter / 2, top: cursorPos.y - cursorDiameter / 2, width: cursorDiameter, height: cursorDiameter, borderColor: tool === "erase" ? "rgba(255,255,255,0.85)" : "rgba(239,68,68,0.9)", background: tool === "erase" ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.18)", boxShadow: "0 0 0 1px rgba(0,0,0,0.35)" }} />
        )}
      </div>
      {emptyError && <div className="border-t border-red-500/40 bg-red-950/80 px-4 py-2 text-center text-sm font-medium text-red-200">Mark an area first.</div>}
      {isMobile ? (
        <div className="space-y-2 border-t border-white/10 bg-background/95 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              <button onClick={() => setTool("circle")} className={`inline-flex items-center gap-2 px-3 py-2 ${tool === "circle" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><Circle className="h-4 w-4" /></button>
              <button onClick={() => setTool("brush")} className={`inline-flex items-center gap-2 px-3 py-2 ${tool === "brush" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><Brush className="h-4 w-4" /></button>
              <button onClick={() => setTool("erase")} className={`inline-flex items-center gap-2 px-3 py-2 ${tool === "erase" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}><Eraser className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={undo} disabled={!canUndo} className="rounded-md border border-border px-3 py-2 hover:bg-secondary disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
              <button onClick={redo} disabled={!canRedo} className="rounded-md border border-border px-3 py-2 hover:bg-secondary disabled:opacity-40"><Redo2 className="h-4 w-4" /></button>
              <button onClick={clearMask} disabled={!hasMark} className="rounded-md border border-border px-3 py-2 hover:bg-secondary disabled:opacity-40"><RotateCcw className="h-4 w-4" /></button>
            </div>
          </div>
          {(tool === "brush" || tool === "erase") && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{tool === "erase" ? "Eraser" : "Brush"}</span>
              <Slider value={[brush]} min={4} max={maxBrush} step={1} onValueChange={(v) => setBrush(v[0])} />
              <span className="w-12 text-right tabular-nums text-sm">{brush}px</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={applying}>Cancel</Button>
            <Button onClick={apply} disabled={applying} className="h-12 w-44 bg-orange-500 text-base font-semibold text-white shadow-lg hover:bg-orange-600 disabled:opacity-60">
              {applying ? <><Check className="mr-1.5 h-4 w-4 animate-pulse" /> Applying…</> : hasMark ? <>Apply selection</> : <>Mark an area first</>}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 border-t border-white/10 bg-background/95 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <SliderRow label="Size" value={brush} min={4} max={maxBrush} onChange={setBrush} suffix="px" />
            <SliderRow label="Opacity" value={opacity} min={10} max={100} onChange={setOpacity} suffix="%" />
            <SliderRow label="Hardness" value={hardness} min={0} max={100} onChange={setHardness} suffix="%" />
            <SliderRow label="Feather" value={feather} min={0} max={20} onChange={setFeather} suffix="px" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SliderRow label="Overlay" value={overlayOpacity} min={10} max={100} onChange={setOverlayOpacity} suffix="%" />
            <div className="flex items-center justify-end gap-2"><Button variant="ghost" onClick={onCancel} disabled={applying}>Cancel</Button></div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <Button onClick={apply} disabled={applying} className="btn-animate h-12 w-full bg-orange-500 text-base font-semibold text-white shadow-lg hover:bg-orange-600 disabled:opacity-60">
              {applying ? <><Check className="mr-1.5 h-4 w-4 animate-pulse" /> Applying…</> : hasMark ? <>✨ Apply selection</> : <>Mark an area first</>}
            </Button>
            <Button variant="outline" onClick={clearMask} disabled={!hasMark || applying} className="btn-animate h-12 whitespace-nowrap"><RotateCcw className="mr-1.5 h-4 w-4" /> Clear</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange, suffix }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
      <span className="w-12 shrink-0 text-right tabular-nums">{value}{suffix}</span>
    </div>
  );
}
