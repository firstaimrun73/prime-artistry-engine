/**
 * Cropmix Crop editor — upload-first, corner handles, custom ratio, taller dock.
 * Preview is stage-fitted so tall 9:16 / large phone photos never collapse to blank.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Check,
  X,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ASPECT_PRESETS,
  DEFAULT_CROP,
  applyAspect,
  clampCrop,
  drawOriented,
  historyInit,
  historyPush,
  historyRedo,
  historyUndo,
  presetDiagramRatio,
  readExifOrientation,
  renderCropToCanvas,
  type HistoryStack,
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
  let w = 12;
  let h = 12;
  if (ratio == null) {
    w = 12;
    h = 10;
  } else if (ratio >= 1) {
    w = max;
    h = Math.max(5, Math.round(max / ratio));
  } else {
    h = max;
    w = Math.max(5, Math.round(max * ratio));
  }
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-[2px] border",
        active ? "border-black/70 bg-black/10" : "border-current/70",
      )}
      style={{ width: w, height: h }}
      aria-hidden
    />
  );
}

export function CropEditor({ file, initialGeometry, onFile, onApply, onCancel }: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const loadGenRef = useRef(0);
  const [srcSize, setSrcSize] = useState({ w: 1, h: 1 });
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [customOpen, setCustomOpen] = useState(false);
  const [customW, setCustomW] = useState("4");
  const [customH, setCustomH] = useState("5");
  const [watermarkOn, setWatermarkOn] = useState(false);
  const [stageTick, setStageTick] = useState(0);
  const [hist, setHist] = useState<HistoryStack<CropGeometry>>(() =>
    historyInit(initialGeometry ?? DEFAULT_CROP),
  );
  const g = hist.present;
  const dragRef = useRef<{
    kind: HandleId;
    startX: number;
    startY: number;
    origin: CropGeometry;
  } | null>(null);

  useEffect(() => {
    if (!file) {
      setReady(false);
      sourceCanvasRef.current = null;
      return;
    }
    const gen = ++loadGenRef.current;
    let objectUrl: string | null = null;
    setReady(false);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        if (gen !== loadGenRef.current) return;
        const orientation = readExifOrientation(buf);
        objectUrl = URL.createObjectURL(new Blob([buf]));
        const img = new Image();
        img.decoding = "async";
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("decode"));
          img.src = objectUrl!;
        });
        if (gen !== loadGenRef.current) return;
        if (!img.naturalWidth || !img.naturalHeight) {
          setReady(false);
          return;
        }
        const canvas = document.createElement("canvas");
        const size = drawOriented(img, orientation, canvas);
        if (gen !== loadGenRef.current) return;
        if (!size.width || !size.height) {
          setReady(false);
          return;
        }
        sourceCanvasRef.current = canvas;
        setSrcSize({ w: size.width, h: size.height });
        const start = applyAspect(initialGeometry ?? DEFAULT_CROP, size.width, size.height);
        setHist(historyInit(start));
        if (start.customW) setCustomW(String(start.customW));
        if (start.customH) setCustomH(String(start.customH));
        setReady(true);
      } catch {
        if (gen === loadGenRef.current) setReady(false);
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    })();
    return () => {
      loadGenRef.current++;
    };
  }, [file, initialGeometry]);

  // Observe stage size + force a few ticks after ready so first paint is never skipped
  // when flex layout still reports 0×0 on the initial layout pass.
  useEffect(() => {
    if (!ready) return;
    const el = stageRef.current;
    if (!el) return;
    const bump = () => setStageTick((n) => n + 1);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(bump);
      ro.observe(el);
    }
    const raf1 = requestAnimationFrame(() => {
      bump();
      requestAnimationFrame(bump);
    });
    const t1 = window.setTimeout(bump, 50);
    const t2 = window.setTimeout(bump, 200);
    const t3 = window.setTimeout(bump, 500);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf1);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [ready]);

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
    if (!ready || !sourceCanvasRef.current || !previewRef.current || !stageRef.current) return;
    const src = sourceCanvasRef.current;
    const canvas = previewRef.current;
    const stage = stageRef.current;

    const stageW = Math.max(1, stage.clientWidth - 24);
    const stageH = Math.max(1, stage.clientHeight - 24);
    // Stage not laid out yet (flex min-h-0) — retry on next frame; never leave blank.
    if (stageW < 2 || stageH < 2) {
      const id = requestAnimationFrame(() => setStageTick((n) => n + 1));
      return () => cancelAnimationFrame(id);
    }

    const r = ((g.rotate90 % 4) + 4) % 4;
    const baseW = src.width;
    const baseH = src.height;
    if (!baseW || !baseH) return;

    const rotatedW = r === 1 || r === 3 ? baseH : baseW;
    const rotatedH = r === 1 || r === 3 ? baseW : baseH;

    const fit = Math.min(stageW / rotatedW, stageH / rotatedH, 1);
    const dispW = Math.max(1, Math.round(rotatedW * fit));
    const dispH = Math.max(1, Math.round(rotatedH * fit));
    const scale = fit;

    canvas.width = dispW;
    canvas.height = dispH;
    canvas.style.width = `${dispW}px`;
    canvas.style.height = `${dispH}px`;
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, dispW, dispH);

    ctx.save();
    if (r === 1) {
      ctx.translate(dispW, 0);
      ctx.rotate(0.5 * Math.PI);
    } else if (r === 2) {
      ctx.translate(dispW, dispH);
      ctx.rotate(Math.PI);
    } else if (r === 3) {
      ctx.translate(0, dispH);
      ctx.rotate(-0.5 * Math.PI);
    }
    const workW = r === 1 || r === 3 ? dispH : dispW;
    const workH = r === 1 || r === 3 ? dispW : dispH;
    if (g.flipH || g.flipV) {
      ctx.translate(g.flipH ? workW : 0, g.flipV ? workH : 0);
      ctx.scale(g.flipH ? -1 : 1, g.flipV ? -1 : 1);
    }
    ctx.drawImage(src, 0, 0, workW, workH);
    ctx.restore();

    const mapPoint = (nx: number, ny: number) => {
      let px = nx * baseW;
      let py = ny * baseH;
      if (g.flipH) px = baseW - px;
      if (g.flipV) py = baseH - py;
      let qx = px;
      let qy = py;
      if (r === 1) {
        qx = baseH - py;
        qy = px;
      } else if (r === 2) {
        qx = baseW - px;
        qy = baseH - py;
      } else if (r === 3) {
        qx = py;
        qy = baseW - px;
      }
      return { x: qx * scale, y: qy * scale };
    };

    const corners = [
      { x: g.x, y: g.y },
      { x: g.x + g.w, y: g.y },
      { x: g.x + g.w, y: g.y + g.h },
      { x: g.x, y: g.y + g.h },
    ];
    const pts = corners.map((c) => mapPoint(c.x, c.y));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    minX = Math.max(0, Math.min(dispW, minX));
    maxX = Math.max(0, Math.min(dispW, maxX));
    minY = Math.max(0, Math.min(dispH, minY));
    maxY = Math.max(0, Math.min(dispH, maxY));
    const gx = minX;
    const gy = minY;
    const gw = Math.max(1, maxX - minX);
    const gh = Math.max(1, maxY - minY);

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, dispW, gy);
    ctx.fillRect(0, gy + gh, dispW, dispH - gy - gh);
    ctx.fillRect(0, gy, gx, gh);
    ctx.fillRect(gx + gw, gy, dispW - gx - gw, gh);
    ctx.strokeStyle = CROPMIX_VOLT;
    ctx.lineWidth = 2;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1);

    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (canvasRect.width > 0 && canvasRect.height > 0) {
      const sx = canvasRect.width / dispW;
      const sy = canvasRect.height / dispH;
      setBox({
        left: canvasRect.left - stageRect.left + gx * sx,
        top: canvasRect.top - stageRect.top + gy * sy,
        width: gw * sx,
        height: gh * sy,
      });
    }
  }, [ready, g, srcSize, stageTick]);

  const hitHandle = (clientX: number, clientY: number): HandleId => {
    const hit = 22;
    const corners: { id: HandleId; x: number; y: number }[] = [
      { id: "nw", x: box.left, y: box.top },
      { id: "ne", x: box.left + box.width, y: box.top },
      { id: "sw", x: box.left, y: box.top + box.height },
      { id: "se", x: box.left + box.width, y: box.top + box.height },
    ];
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return "move";
    const px = clientX - stage.left;
    const py = clientY - stage.top;
    for (const c of corners) {
      if (Math.abs(px - c.x) <= hit && Math.abs(py - c.y) <= hit) return c.id;
    }
    return "move";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready) return;
    e.preventDefault();
    const kind = hitHandle(e.clientX, e.clientY);
    dragRef.current = { kind, startX: e.clientX, startY: e.clientY, origin: g };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const o = dragRef.current.origin;
    const kind = dragRef.current.kind;
    if (kind === "move") {
      commit(clampCrop({ ...o, x: o.x + dx, y: o.y + dy }));
      return;
    }
    let x = o.x;
    let y = o.y;
    let w = o.w;
    let h = o.h;
    if (kind === "nw") {
      x = o.x + dx;
      y = o.y + dy;
      w = o.w - dx;
      h = o.h - dy;
    } else if (kind === "ne") {
      y = o.y + dy;
      w = o.w + dx;
      h = o.h - dy;
    } else if (kind === "sw") {
      x = o.x + dx;
      w = o.w - dx;
      h = o.h + dy;
    } else if (kind === "se") {
      w = o.w + dx;
      h = o.h + dy;
    }
    if (o.aspectId !== "free" && o.aspectId !== "original") {
      const ratio =
        o.aspectId === "custom" && o.customW > 0 && o.customH > 0
          ? o.customW / o.customH
          : ASPECT_PRESETS.find((p) => p.id === o.aspectId)?.ratio;
      if (ratio && ratio > 0 && srcSize.w > 0 && srcSize.h > 0) {
        const imgRatio = srcSize.w / srcSize.h;
        const target = ratio / imgRatio;
        h = w / target;
      }
    }
    commit(clampCrop({ ...o, x, y, w, h }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleApply = () => {
    if (!sourceCanvasRef.current) return;
    const { canvas, width, height } = renderCropToCanvas(sourceCanvasRef.current, g);
    if (watermarkOn) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawCropmixWatermark(ctx, width, height);
    }
    onApply(canvas.toDataURL("image/jpeg", 0.95), g, width, height);
  };

  const toolsDisabled = !ready;

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
        <button type="button" disabled={toolsDisabled} onClick={handleApply}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
          style={{ backgroundColor: CROPMIX_VOLT }}>
          <Check className="h-4 w-4" />
          Apply
        </button>
      </header>

      <div ref={stageRef} className="relative flex min-h-[40vh] flex-1 items-center justify-center overflow-hidden bg-black/90 p-3"
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
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <canvas ref={previewRef} className="touch-none" />
            <div className="pointer-events-none absolute" style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
              {(["nw", "ne", "sw", "se"] as const).map((id) => (
                <span key={id} className="absolute h-3.5 w-3.5 rounded-full border-2 border-black shadow-sm"
                  style={{
                    backgroundColor: CROPMIX_VOLT,
                    left: id === "nw" || id === "sw" ? -7 : undefined,
                    right: id === "ne" || id === "se" ? -7 : undefined,
                    top: id === "nw" || id === "ne" ? -7 : undefined,
                    bottom: id === "sw" || id === "se" ? -7 : undefined,
                  }}
                />
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
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium disabled:opacity-40",
                  active ? "border-transparent text-black" : "border-border text-muted-foreground",
                )}
                style={active ? { backgroundColor: CROPMIX_VOLT } : undefined}>
                <RatioGlyph ratio={ratio} active={active} />
                {p.label}
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
              style={{ backgroundColor: CROPMIX_VOLT }}>
              Apply ratio
            </button>
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

        <label
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-medium",
            toolsDisabled ? "opacity-40" : "bg-background",
          )}
        >
          <input
            type="checkbox"
            checked={watermarkOn}
            disabled={toolsDisabled}
            onChange={(e) => setWatermarkOn(e.target.checked)}
            className="h-4 w-4 accent-[#C6FF3D]"
          />
          Add Motio2edit watermark
        </label>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }} />
    </div>
  );
}
