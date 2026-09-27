/**
 * Cropmix — upload-first. Real <img> preview (never blank). Canvas only for Apply.
 * Aspect chips use solid ratio-frame icons; crop handles are L-brackets (not dots).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Undo2, Redo2, Check, X, Upload, Crop,
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

/**
 * Map a screen-space AABB corner handle to the source-space crop corner it
 * represents after flip/rotate. Without this, flip/inverse makes drag
 * directions feel inverted (visual left handle adjusts the wrong edge).
 */
function visualHandleToSource(
  visual: HandleId,
  flipH: boolean,
  flipV: boolean,
  rotate90: number,
): HandleId {
  if (visual === "move") return "move";
  const r = ((rotate90 % 4) + 4) % 4;
  // Target visual corner in unit square (0/1).
  const target: Record<Exclude<HandleId, "move">, [number, number]> = {
    nw: [0, 0],
    ne: [1, 0],
    sw: [0, 1],
    se: [1, 1],
  };
  const [tvx, tvy] = target[visual];
  const candidates: Array<{ id: Exclude<HandleId, "move">; cx: number; cy: number }> = [
    { id: "nw", cx: 0, cy: 0 },
    { id: "ne", cx: 1, cy: 0 },
    { id: "sw", cx: 0, cy: 1 },
    { id: "se", cx: 1, cy: 1 },
  ];
  for (const c of candidates) {
    let px = c.cx;
    let py = c.cy;
    if (flipH) px = 1 - px;
    if (flipV) py = 1 - py;
    let qx = px;
    let qy = py;
    if (r === 1) {
      qx = 1 - py;
      qy = px;
    } else if (r === 2) {
      qx = 1 - px;
      qy = 1 - py;
    } else if (r === 3) {
      qx = py;
      qy = 1 - px;
    }
    if (Math.abs(qx - tvx) < 1e-6 && Math.abs(qy - tvy) < 1e-6) return c.id;
  }
  return visual;
}

/** Solid aspect-ratio frame icon (clear shape, not a thin/dot glyph). */
function RatioGlyph({ ratio, active }: { ratio: number | null; active: boolean }) {
  const box = 22;
  let w = 16;
  let h = 16;
  if (ratio == null) {
    w = 16;
    h = 14;
  } else if (ratio >= 1) {
    w = box;
    h = Math.max(8, Math.round(box / ratio));
  } else {
    h = box;
    w = Math.max(8, Math.round(box * ratio));
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: box + 2, height: box + 2 }}
      aria-hidden
    >
      <span
        className={cn(
          "block rounded-[3px] border-[2.5px]",
          active ? "border-black bg-black/15" : "border-current/90 bg-current/10",
        )}
        style={{ width: w, height: h }}
      />
    </span>
  );
}
