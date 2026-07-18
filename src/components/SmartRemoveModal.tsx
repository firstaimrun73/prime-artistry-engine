// Professional masking system for "Circle to Remove".
//
// Produces a black/white mask (white = area to remove) that feeds the
// inpainting pipeline. Includes brush + erase, opacity/hardness/feather,
// zoom + pan, mask overlay toggle, invert, undo/redo, and before/after view.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  X, Eraser, Check, Brush, ZoomIn, ZoomOut, Undo2, Redo2,
  Move, EyeOff, Eye, FlipHorizontal2, RotateCcw,
} from "lucide-react";

type Props = {
  open: boolean;
  imageUrl: string | null;
  onCancel: () => void;
  onApply: (maskDataUrl: string) => void;
};

export const SMART_REMOVE_PROMPT =
  "Remove only the masked area completely. Reconstruct it naturally using the surrounding textures, lighting, shadows, reflections and perspective so the result looks like the object was never there. Keep every unmasked pixel identical.";

type Tool = "brush" | "erase";
const ZOOM_STEPS = [0.25, 0.5, 1, 2, 4, 8];
const MAX_HISTORY = 30;

export function SmartRemoveModal({ open, imageUrl, onCancel, onApply }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);   // natural-resolution raw mask (alpha only)
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);   // on-screen composite
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const panningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const spaceDownRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);

  // Settings
  const [tool, setTool] = useState<Tool>("brush");
  const [brush, setBrush] = useState(40);
  const [opacity, setOpacity] = useState(100);
  const [hardness, setHardness] = useState(80);   // 100 = crisp, lower = softer edge
  const [feather, setFeather] = useState(2);      // extra soft edge (px, in natural res)
  const [overlayOpacity, setOverlayOpacity] = useState(55);
  const [showMask, setShowMask] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [hasMark, setHasMark] = useState(false);
  const [applying, setApplying] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setReady(false);
      setHasMark(false);
      setApplying(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      historyRef.current = [];
      historyIndexRef.current = -1;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [open]);

  const naturalSize = () => {
    const img = imgRef.current;
    return img && img.naturalWidth && img.naturalHeight
      ? { w: img.naturalWidth, h: img.naturalHeight }
      : null;
  };

  // Fit image inside viewport at zoom=1
  const fitScale = useMemo(() => {
    const vp = viewportRef.current;
    const n = naturalSize();
    if (!vp || !n) return 1;
    return Math.min(vp.clientWidth / n.w, vp.clientHeight / n.h, 1);
  }, [ready, open]);

  const displayScale = fitScale * zoom;

  const pushHistory = useCallback(() => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, c.width, c.height);
    const arr = historyRef.current.slice(0, historyIndexRef.current + 1);
    arr.push(snap);
    if (arr.length > MAX_HISTORY) arr.shift();
    historyRef.current = arr;
    historyIndexRef.current = arr.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const paintView = useCallback(() => {
    const view = viewCanvasRef.current;
    const img = imgRef.current;
    const mask = maskCanvasRef.current;
    if (!view || !img || !mask) return;
    const n = naturalSize();
    if (!n) return;

    const w = Math.max(1, Math.round(n.w * displayScale));
    const h = Math.max(1, Math.round(n.h * displayScale));
    if (view.width !== w) view.width = w;
    if (view.height !== h) view.height = h;

    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    if (showMask) {
      // Convert alpha mask to a red tint overlay for display.
      const tint = document.createElement("canvas");
      tint.width = mask.width;
      tint.height = mask.height;
      const tctx = tint.getContext("2d");
      if (tctx) {
        tctx.drawImage(mask, 0, 0);
        tctx.globalCompositeOperation = "source-in";
        tctx.fillStyle = "rgba(239, 68, 68, 1)";
        tctx.fillRect(0, 0, tint.width, tint.height);
        ctx.globalAlpha = overlayOpacity / 100;
        ctx.drawImage(tint, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }
  }, [displayScale, showMask, overlayOpacity]);

  const onImageLoad = () => {
    const img = imgRef.current;
    const mask = maskCanvasRef.current;
    if (!img || !mask) return;
    mask.width = img.naturalWidth;
    mask.height = img.naturalHeight;
    const ctx = mask.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, mask.width, mask.height);
    setReady(true);
    setHasMark(false);
    historyRef.current = [];
    historyIndexRef.current = -1;
    // Seed history with an empty snapshot for clean undo baseline.
    setTimeout(() => {
      pushHistory();
      paintView();
    }, 0);
  };

  useEffect(() => {
    if (!ready) return;
    paintView();
  }, [ready, paintView]);

  // Redraw on resize
  useEffect(() => {
    if (!open) return;
    const onResize = () => paintView();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, paintView]);

  // Map viewport-relative client coords to natural-image pixel coords.
  const pointFromClient = (clientX: number, clientY: number) => {
    const view = viewCanvasRef.current!;
    const rect = view.getBoundingClientRect();
    const x = (clientX - rect.left) / displayScale;
    const y = (clientY - rect.top) / displayScale;
    return { x, y };
  };

  const drawStamp = (x: number, y: number) => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = brush / 2;
    const alpha = (opacity / 100) * (tool === "brush" ? 1 : 1);

    if (tool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      const inner = Math.max(0, Math.min(1, hardness / 100));
      const grad = ctx.createRadialGradient(x, y, r * inner, x, y, r + feather);
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r + feather, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r + feather, 0, Math.PI * 2);
      ctx.fill();
    }
    setHasMark(true);
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1, brush / 6);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      drawStamp(from.x + dx * t, from.y + dy * t);
    }
    paintView();
  };

  const beginStroke = (clientX: number, clientY: number) => {
    const p = pointFromClient(clientX, clientY);
    lastPtRef.current = p;
    drawStamp(p.x, p.y);
    paintView();
  };
  const continueStroke = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const p = pointFromClient(clientX, clientY);
    const prev = lastPtRef.current ?? p;
    stroke(prev, p);
    lastPtRef.current = p;
  };
  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPtRef.current = null;
    pushHistory();
  };

  // Pointer handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (spaceDownRef.current || e.button === 1) {
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      return;
    }
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    beginStroke(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panningRef.current && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setOffset({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
      return;
    }
    continueStroke(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (panningRef.current) {
      panningRef.current = false;
      panStartRef.current = null;
      return;
    }
    endStroke();
  };

  // Wheel: zoom (ctrl/meta) or brush resize (default)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom((z) => Math.max(0.25, Math.min(8, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    } else {
      setBrush((b) => Math.max(1, Math.min(100, b + (e.deltaY < 0 ? 2 : -2))));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { spaceDownRef.current = true; e.preventDefault(); return; }
      if (e.key === "[") setBrush((b) => Math.max(1, b - 2));
      if (e.key === "]") setBrush((b) => Math.min(100, b + 2));
      if (e.key.toLowerCase() === "b") setTool("brush");
      if (e.key.toLowerCase() === "e") setTool("erase");
      if (e.key.toLowerCase() === "m") setShowMask((v) => !v);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDownRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const restoreSnapshot = (snap: ImageData) => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(snap, 0, 0);
    paintView();
    // Recompute hasMark quickly
    let any = false;
    for (let i = 3; i < snap.data.length; i += 4) {
      if (snap.data[i] > 0) { any = true; break; }
    }
    setHasMark(any);
  };

  const undo = () => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };
  const redo = () => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const clearMask = () => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    paintView();
    setHasMark(false);
    pushHistory();
  };

  const invertMask = () => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
      img.data[i + 3] = 255 - img.data[i + 3];
    }
    ctx.putImageData(img, 0, 0);
    paintView();
    setHasMark(true);
    pushHistory();
  };

  const stepZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.findIndex((v) => Math.abs(v - zoom) < 0.001);
    if (i === -1) {
      // pick nearest
      let nearest = 0;
      for (let k = 0; k < ZOOM_STEPS.length; k++) {
        if (Math.abs(ZOOM_STEPS[k] - zoom) < Math.abs(ZOOM_STEPS[nearest] - zoom)) nearest = k;
      }
      setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, nearest + dir))]);
    } else {
      setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir))]);
    }
  };

  const apply = async () => {
    const c = maskCanvasRef.current;
    if (!c || !hasMark) return;
    setApplying(true);
    try {
      // Threshold soft alpha into hard B/W mask for the inpainting model.
      const out = document.createElement("canvas");
      out.width = c.width;
      out.height = c.height;
      const octx = out.getContext("2d");
      const mctx = c.getContext("2d");
      if (!octx || !mctx) return;
      octx.fillStyle = "black";
      octx.fillRect(0, 0, out.width, out.height);
      const src = mctx.getImageData(0, 0, c.width, c.height);
      const bw = octx.createImageData(out.width, out.height);
      let painted = 0;
      for (let i = 0; i < src.data.length; i += 4) {
        const on = src.data[i + 3] >= 24 ? 255 : 0;
        if (on) painted++;
        bw.data[i] = on; bw.data[i + 1] = on; bw.data[i + 2] = on; bw.data[i + 3] = 255;
      }
      if (painted === 0) { setApplying(false); setHasMark(false); return; }
      octx.putImageData(bw, 0, 0);
      onApply(out.toDataURL("image/png"));
    } finally {
      setApplying(false);
    }
  };

  if (!open || !imageUrl) return null;

  const n = naturalSize();
  const dispW = n ? Math.round(n.w * displayScale) : 0;
  const dispH = n ? Math.round(n.h * displayScale) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85"
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-background/95 px-4 py-3">
        <div>
          <h2 className="text-base font-bold">Circle to Remove</h2>
          <p className="text-xs text-muted-foreground">
            Paint what you want gone. Costs 25 credits. Space = pan · [/] = brush size · Ctrl+Z / Ctrl+Y = undo/redo
          </p>
        </div>
        <button onClick={onCancel} className="rounded-md p-2 text-muted-foreground hover:bg-secondary" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-background/95 px-4 py-2 text-xs">
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          <button onClick={() => setTool("brush")} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 ${tool === "brush" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
            <Brush className="h-3.5 w-3.5" /> Brush
          </button>
          <button onClick={() => setTool("erase")} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 ${tool === "erase" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
            <Eraser className="h-3.5 w-3.5" /> Erase
          </button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border px-1">
          <button onClick={() => stepZoom(-1)} className="p-1.5 hover:bg-secondary" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
          <span className="tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => stepZoom(1)} className="p-1.5 hover:bg-secondary" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
        </div>

        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary">
          <Move className="h-3.5 w-3.5" /> Fit
        </button>

        <button onClick={undo} disabled={!canUndo} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40">
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button onClick={redo} disabled={!canRedo} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40">
          <Redo2 className="h-3.5 w-3.5" /> Redo
        </button>

        <button onClick={invertMask} disabled={!hasMark} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40">
          <FlipHorizontal2 className="h-3.5 w-3.5" /> Invert
        </button>
        <button onClick={clearMask} disabled={!hasMark} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary disabled:opacity-40">
          <RotateCcw className="h-3.5 w-3.5" /> Clear
        </button>
        <button onClick={() => setShowMask((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:bg-secondary">
          {showMask ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showMask ? "Hide mask" : "Show mask"}
        </button>
      </div>

      {/* Stage */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_60%)]"
        style={{ touchAction: "none" }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          onLoad={onImageLoad}
          alt=""
          className="hidden"
          crossOrigin="anonymous"
        />
        <canvas ref={maskCanvasRef} className="hidden" />
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
              onWheel={onWheel}
              className="block h-full w-full"
              style={{
                cursor: panningRef.current || spaceDownRef.current ? "grabbing" : tool === "erase" ? "cell" : "crosshair",
                touchAction: "none",
              }}
            />
          </div>
        )}
      </div>

      {/* Settings + actions */}
      <div className="space-y-3 border-t border-white/10 bg-background/95 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <SliderRow label="Size" value={brush} min={1} max={100} onChange={setBrush} suffix="px" />
          <SliderRow label="Opacity" value={opacity} min={10} max={100} onChange={setOpacity} suffix="%" />
          <SliderRow label="Hardness" value={hardness} min={0} max={100} onChange={setHardness} suffix="%" />
          <SliderRow label="Feather" value={feather} min={0} max={20} onChange={setFeather} suffix="px" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SliderRow label="Overlay" value={overlayOpacity} min={10} max={100} onChange={setOverlayOpacity} suffix="%" />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={applying}>Cancel</Button>
            <Button onClick={apply} disabled={!hasMark || applying}>
              <Check className="mr-1.5 h-4 w-4" />
              {applying ? "Applying…" : hasMark ? "Apply mask" : "Paint an area to remove"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, onChange, suffix,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
      <span className="w-12 shrink-0 text-right tabular-nums">{value}{suffix}</span>
    </div>
  );
}
