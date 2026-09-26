/**
 * Cropmix — upload-first. Preview = real <img> (never blank / never stuck Loading).
 * Canvas only for Apply/export.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Undo2, Redo2, Check, X, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ASPECT_PRESETS, DEFAULT_CROP, applyAspect, clampCrop, drawOriented,
  historyInit, historyPush, historyRedo, historyUndo, presetDiagramRatio,
  readExifOrientation, renderCropToCanvas, type HistoryStack,
} from "@/lib/cropmix/crop-geometry";
import type { AspectPresetId, CropGeometry } from "@/lib/cropmix/types";
import { CROPMIX_VOLT } from "@/lib/cropmix/types";
import { drawCropmixWatermark } from "@/lib/cropmix/watermark";

type Props = {
  file: File | null;
  initialGeometry?: CropGeometry;
  onFile: (file: File) => void;
  onApply: (dataUrl: string, geometry: CropGeometry, width: number, height: number) => void;
  onCancel: () => void;
};
type HandleId = "nw" | "ne" | "sw" | "se" | "move";

function RatioGlyph({ ratio, active }: { ratio: number | null; active: boolean }) {
  const max = 14;
  let w = 12, h = 12;
  if (ratio == null) { w = 12; h = 10; }
  else if (ratio >= 1) { w = max; h = Math.max(5, Math.round(max / ratio)); }
  else { h = max; w = Math.max(5, Math.round(max * ratio)); }
  return (
    <span className={cn("inline-block shrink-0 rounded-[2px] border", active ? "border-black/70 bg-black/10" : "border-current/70")}
      style={{ width: w, height: h }} aria-hidden />
  );
}

export function CropEditor({ file, initialGeometry, onFile, onApply, onCancel }: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadGenRef = useRef(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [srcSize, setSrcSize] = useState({ w: 1, h: 1 });
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [imgBox, setImgBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [customOpen, setCustomOpen] = useState(false);
  const [customW, setCustomW] = useState("4");
  const [customH, setCustomH] = useState("5");
  const [watermarkOn, setWatermarkOn] = useState(false);
  const [stageTick, setStageTick] = useState(0);
  const [hist, setHist] = useState<HistoryStack<CropGeometry>>(() => historyInit(initialGeometry ?? DEFAULT_CROP));
  const g = hist.present;
  const dragRef = useRef<{ kind: HandleId; startX: number; startY: number; origin: CropGeometry } | null>(null);

  useEffect(() => {
    if (!file) {
      setReady(false);
      sourceCanvasRef.current = null;
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    const gen = ++loadGenRef.current;
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    setReady(false);

    (async () => {
      try {
        const img = new Image();
        img.decoding = "async";
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("decode"));
          img.src = url;
        });
        if (gen !== loadGenRef.current) return;
        if (!img.naturalWidth || !img.naturalHeight) { setReady(false); return; }

        let orientation = 1;
        try {
          orientation = readExifOrientation(await file.arrayBuffer());
        } catch { /* keep 1 */ }

        const swap = orientation >= 5 && orientation <= 8;
        let ow = swap ? img.naturalHeight : img.naturalWidth;
        let oh = swap ? img.naturalWidth : img.naturalHeight;

        try {
          const canvas = document.createElement("canvas");
          const size = drawOriented(img, orientation, canvas);
          if (size.width && size.height) {
            sourceCanvasRef.current = canvas;
            ow = size.width;
            oh = size.height;
          }
        } catch {
          sourceCanvasRef.current = null;
        }

        if (gen !== loadGenRef.current) return;
        setSrcSize({ w: ow, h: oh });
        const start = applyAspect(initialGeometry ?? DEFAULT_CROP, ow, oh);
        setHist(historyInit(start));
        if (start.customW) setCustomW(String(start.customW));
        if (start.customH) setCustomH(String(start.customH));
        setReady(true);
      } catch {
        if (gen === loadGenRef.current) setReady(false);
      }
    })();

    return () => { loadGenRef.current++; };
  }, [file, initialGeometry]);

  useEffect(() => {
    if (!previewUrl) return;
    const el = stageRef.current;
    if (!el) return;
    const bump = () => setStageTick((n) => n + 1);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(bump);
      ro.observe(el);
    }
    const id = requestAnimationFrame(() => { bump(); requestAnimationFrame(bump); });
    const t1 = window.setTimeout(bump, 50);
    const t2 = window.setTimeout(bump, 250);
    return () => { ro?.disconnect(); cancelAnimationFrame(id); window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [previewUrl, ready]);

  const commit = useCallback((next: CropGeometry) => {
    setHist((h) => historyPush(h, clampCrop(next)));
  }, []);

  const setAspect = (id: AspectPresetId) => {
    if (id === "custom") {
      setCustomOpen(true);
      const nw = Math.max(1, Number(customW) || 1);
      const nh = Math.max(1, Number(customH) || 1);
      commit(applyAspect({ ...g, aspectId: "custom", customW: nw, customH: nh }, srcSize.w, srcSize.h));
      return;
    }
    setCustomOpen(false);
    commit(applyAspect({ ...g, aspectId: id }, srcSize.w, srcSize.h));
  };

  const applyCustomRatio = () => {
    const nw = Math.max(1, Number(customW) || 1);
    const nh = Math.max(1, Number(customH) || 1);
    commit(applyAspect({ ...g, aspectId: "custom", customW: nw, customH: nh }, srcSize.w, srcSize.h));
  };

  useLayoutEffect(() => {
    if (!previewUrl || !stageRef.current || !imgRef.current) return;
    const stage = stageRef.current;
    const img = imgRef.current;
    const stageRect = stage.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (stageRect.width < 2 || imgRect.width < 1) {
      const id = requestAnimationFrame(() => setStageTick((n) => n + 1));
      return () => cancelAnimationFrame(id);
    }
    const left = imgRect.left - stageRect.left;
    const top = imgRect.top - stageRect.top;
    const width = imgRect.width;
    const height = imgRect.height;
    setImgBox({ left, top, width, height });

    const r = ((g.rotate90 % 4) + 4) % 4;
    const mapPoint = (nx: number, ny: number) => {
      let px = nx, py = ny;
      if (g.flipH) px = 1 - px;
      if (g.flipV) py = 1 - py;
      let qx = px, qy = py;
      if (r === 1) { qx = 1 - py; qy = px; }
      else if (r === 2) { qx = 1 - px; qy = 1 - py; }
      else if (r === 3) { qx = py; qy = 1 - px; }
      return { x: left + qx * width, y: top + qy * height };
    };
    const corners = [
      { x: g.x, y: g.y }, { x: g.x + g.w, y: g.y },
      { x: g.x + g.w, y: g.y + g.h }, { x: g.x, y: g.y + g.h },
    ];
    const pts = corners.map((c) => mapPoint(c.x, c.y));
    let minX = Math.min(...pts.map((p) => p.x));
    let maxX = Math.max(...pts.map((p) => p.x));
    let minY = Math.min(...pts.map((p) => p.y));
    let maxY = Math.max(...pts.map((p) => p.y));
    minX = Math.max(left, Math.min(left + width, minX));
    maxX = Math.max(left, Math.min(left + width, maxX));
    minY = Math.max(top, Math.min(top + height, minY));
    maxY = Math.max(top, Math.min(top + height, maxY));
    setBox({ left: minX, top: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) });
  }, [previewUrl, ready, g, srcSize, stageTick]);

  const hitHandle = (clientX: number, clientY: number): HandleId => {
    const hit = 22;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return "move";
    const px = clientX - stage.left, py = clientY - stage.top;
    for (const [id, x, y] of [
      ["nw", box.left, box.top], ["ne", box.left + box.width, box.top],
      ["sw", box.left, box.top + box.height], ["se", box.left + box.width, box.top + box.height],
    ] as const) {
      if (Math.abs(px - x) <= hit && Math.abs(py - y) <= hit) return id;
    }
    return "move";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready) return;
    e.preventDefault();
    dragRef.current = { kind: hitHandle(e.clientX, e.clientY), startX: e.clientX, startY: e.clientY, origin: g };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || imgBox.width < 1) return;
    const dx = (e.clientX - dragRef.current.startX) / imgBox.width;
    const dy = (e.clientY - dragRef.current.startY) / imgBox.height;
    const o = dragRef.current.origin;
    const kind = dragRef.current.kind;
    const r = ((o.rotate90 % 4) + 4) % 4;
    let mdx = dx, mdy = dy;
    if (r === 1) { mdx = dy; mdy = -dx; }
    else if (r === 2) { mdx = -dx; mdy = -dy; }
    else if (r === 3) { mdx = -dy; mdy = dx; }
    if (o.flipH) mdx = -mdx;
    if (o.flipV) mdy = -mdy;
    if (kind === "move") {
      commit(clampCrop({ ...o, x: o.x + mdx, y: o.y + mdy }));
      return;
    }
    let x = o.x, y = o.y, w = o.w, h = o.h;
    if (kind === "nw") { x = o.x + mdx; y = o.y + mdy; w = o.w - mdx; h = o.h - mdy; }
    else if (kind === "ne") { y = o.y + mdy; w = o.w + mdx; h = o.h - mdy; }
    else if (kind === "sw") { x = o.x + mdx; w = o.w - mdx; h = o.h + mdy; }
    else if (kind === "se") { w = o.w + mdx; h = o.h + mdy; }
    if (o.aspectId !== "free" && o.aspectId !== "original") {
      const ratio = o.aspectId === "custom" && o.customW > 0 && o.customH > 0
        ? o.customW / o.customH
        : ASPECT_PRESETS.find((p) => p.id === o.aspectId)?.ratio;
      if (ratio && ratio > 0 && srcSize.w > 0) {
        h = w / (ratio / (srcSize.w / srcSize.h));
      }
    }
    commit(clampCrop({ ...o, x, y, w, h }));
  };

  const onPointerUp = () => { dragRef.current = null; };

  const handleApply = async () => {
    let src = sourceCanvasRef.current;
    if (!src && previewUrl && file) {
      try {
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("decode"));
          img.src = previewUrl;
        });
        const orientation = readExifOrientation(await file.arrayBuffer());
        const canvas = document.createElement("canvas");
        const size = drawOriented(img, orientation, canvas);
        if (size.width && size.height) {
          src = canvas;
          sourceCanvasRef.current = canvas;
        }
      } catch { /* ignore */ }
    }
    if (!src) return;
    const { canvas, width, height } = renderCropToCanvas(src, g);
    if (watermarkOn) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawCropmixWatermark(ctx, width, height);
    }
    onApply(canvas.toDataURL("image/jpeg", 0.95), g, width, height);
  };

  const toolsDisabled = !ready;
  const r = ((g.rotate90 % 4) + 4) % 4;
  const parts: string[] = [];
  if (r === 1) parts.push("rotate(90deg)");
  else if (r === 2) parts.push("rotate(180deg)");
  else if (r === 3) parts.push("rotate(-90deg)");
  if (g.flipH) parts.push("scaleX(-1)");
  if (g.flipV) parts.push("scaleY(-1)");
  const imgTransform = parts.join(" ") || undefined;

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full border border-border" aria-label="Back">
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Motio<span className="text-[#FF5A1F]">2</span>edit
          </p>
          <h1 className="truncate text-sm font-bold tracking-tight">Cropmix</h1>
        </div>
        <button type="button" disabled={toolsDisabled} onClick={() => void handleApply()}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
          style={{ backgroundColor: CROPMIX_VOLT }}>
          <Check className="h-4 w-4" /> Apply
        </button>
      </header>

      <div ref={stageRef}
        className="relative flex min-h-[40vh] flex-1 items-center justify-center overflow-hidden bg-black/90 p-3"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {!file ? (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </span>
            <span className="text-sm font-semibold">Upload an image to begin</span>
            <span className="text-xs text-muted-foreground">JPG, PNG, or WEBP · crop tools unlock after upload</span>
          </button>
        ) : !previewUrl ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <img ref={imgRef} src={previewUrl} alt="Crop preview" draggable={false}
              className="touch-none select-none"
              style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", transform: imgTransform, transformOrigin: "center center" }}
              onLoad={() => setStageTick((n) => n + 1)} />
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute bg-black/55" style={{ left: 0, top: 0, right: 0, height: Math.max(0, box.top) }} />
              <div className="absolute bg-black/55" style={{ left: 0, top: box.top + box.height, right: 0, bottom: 0 }} />
              <div className="absolute bg-black/55" style={{ left: 0, top: box.top, width: Math.max(0, box.left), height: box.height }} />
              <div className="absolute bg-black/55" style={{ left: box.left + box.width, top: box.top, right: 0, height: box.height }} />
            </div>
            <div className="pointer-events-none absolute border-2"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height, borderColor: CROPMIX_VOLT }}>
              {(["nw", "ne", "sw", "se"] as const).map((id) => (
                <span key={id} className="absolute h-3.5 w-3.5 rounded-full border-2 border-black shadow-sm"
                  style={{
                    backgroundColor: CROPMIX_VOLT,
                    left: id === "nw" || id === "sw" ? -7 : undefined,
                    right: id === "ne" || id === "se" ? -7 : undefined,
                    top: id === "nw" || id === "ne" ? -7 : undefined,
                    bottom: id === "sw" || id === "se" ? -7 : undefined,
                  }} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border bg-card/90 px-3 py-4 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ASPECT_PRESETS.map((p) => {
            const active = g.aspectId === p.id;
            const ratio = presetDiagramRatio(p.id, Number(customW) || 1, Number(customH) || 1);
            return (
              <button key={p.id} type="button" disabled={toolsDisabled} onClick={() => setAspect(p.id)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium disabled:opacity-40",
                  active ? "border-transparent text-black" : "border-border text-muted-foreground")}
                style={active ? { backgroundColor: CROPMIX_VOLT } : undefined}>
                <RatioGlyph ratio={ratio} active={active} />{p.label}
              </button>
            );
          })}
        </div>
        {customOpen && !toolsDisabled && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <span className="text-[11px] font-medium text-muted-foreground">Custom</span>
            <input type="number" min={1} value={customW} onChange={(e) => setCustomW(e.target.value)}
              className="h-9 w-16 rounded-lg border border-border bg-card px-2 text-sm" aria-label="Custom width" />
            <span className="text-muted-foreground">:</span>
            <input type="number" min={1} value={customH} onChange={(e) => setCustomH(e.target.value)}
              className="h-9 w-16 rounded-lg border border-border bg-card px-2 text-sm" aria-label="Custom height" />
            <button type="button" onClick={applyCustomRatio}
              className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-black"
              style={{ backgroundColor: CROPMIX_VOLT }}>Apply ratio</button>
          </div>
        )}
        <div className="flex items-center justify-center gap-3 py-1">
          <button type="button" disabled={toolsDisabled} onClick={() => setHist((h) => historyUndo(h))} className="rounded-xl border border-border p-2.5 disabled:opacity-40" aria-label="Undo"><Undo2 className="h-5 w-5" /></button>
          <button type="button" disabled={toolsDisabled} onClick={() => setHist((h) => historyRedo(h))} className="rounded-xl border border-border p-2.5 disabled:opacity-40" aria-label="Redo"><Redo2 className="h-5 w-5" /></button>
          <button type="button" disabled={toolsDisabled} onClick={() => commit({ ...g, rotate90: ((g.rotate90 % 4) + 3) % 4 })} className="rounded-xl border border-border p-2.5 disabled:opacity-40" aria-label="Rotate left"><RotateCcw className="h-5 w-5" /></button>
          <button type="button" disabled={toolsDisabled} onClick={() => commit({ ...g, rotate90: ((g.rotate90 % 4) + 1) % 4 })} className="rounded-xl border border-border p-2.5 disabled:opacity-40" aria-label="Rotate right"><RotateCw className="h-5 w-5" /></button>
          <button type="button" disabled={toolsDisabled} onClick={() => commit({ ...g, flipH: !g.flipH })} className="rounded-xl border border-border p-2.5 disabled:opacity-40" aria-label="Flip horizontal"><FlipHorizontal className="h-5 w-5" /></button>
          <button type="button" disabled={toolsDisabled} onClick={() => commit({ ...g, flipV: !g.flipV })} className="rounded-xl border border-border p-2.5 disabled:opacity-40" aria-label="Flip vertical"><FlipVertical className="h-5 w-5" /></button>
        </div>
        <label className={cn("flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-medium", toolsDisabled ? "opacity-40" : "bg-background")}>
          <input type="checkbox" checked={watermarkOn} disabled={toolsDisabled} onChange={(e) => setWatermarkOn(e.target.checked)} className="h-4 w-4 accent-[#C6FF3D]" />
          Add Motio2edit watermark
        </label>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}
