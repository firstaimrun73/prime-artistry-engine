/**
 * Motio2edit Lens public API — quality kernels in opt-*.ts
 */
import type { CameraLensDef, LensAspectId } from "./roster";
import { captureVideoFrame, cropToAspect, canvasToBlob, clone } from "./opt-core";
import { applyLensById } from "./opt-switch";
import { infrared } from "./opt-fx1";

export { captureVideoFrame, cropToAspect, canvasToBlob };

/** Free-tier watermark — bottom-right, subtle, Motio2edit branded */
export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src);
  const ctx = c.getContext("2d")!;
  const pad = Math.max(14, Math.round(Math.min(c.width, c.height) * 0.024));
  const fs = Math.max(13, Math.round(Math.min(c.width, c.height) * 0.028));
  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  ctx.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("Motio2edit", c.width - pad, c.height - pad - fs * 1.15);
  ctx.font = `500 ${Math.round(fs * 0.78)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Lenses", c.width - pad, c.height - pad);
  ctx.restore();
  return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  opts?: { watermark?: boolean },
): HTMLCanvasElement {
  let result = applyLensById(source, lens.id, aspectId);
  if (opts?.watermark === true) result = applyFreeLensWatermark(result);
  return result;
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLVideoElement,
  lens: CameraLensDef,
  aspectId: LensAspectId = "native",
  mirror = false,
  opts?: { watermark?: boolean },
): HTMLCanvasElement {
  const frame = source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId, opts);
}

export function nightBoostPreview(src: HTMLCanvasElement, _s = 0.9): HTMLCanvasElement {
  return infrared(src);
}
