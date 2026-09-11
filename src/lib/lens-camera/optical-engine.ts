/**
 * Motio2edit Lens public API — quality kernels in opt-*.ts
 */
import type { CameraLensDef, LensAspectId } from "./roster";
import { captureVideoFrame, cropToAspect, canvasToBlob, clone } from "./opt-core";
import { applyLensById } from "./opt-switch";
import { infrared } from "./opt-fx1";

export { captureVideoFrame, cropToAspect, canvasToBlob };

export function applyFreeLensWatermark(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = clone(src); const ctx = c.getContext("2d")!;
  const pad = Math.max(12, Math.round(Math.min(c.width,c.height)*0.022));
  const fs = Math.max(12, Math.round(Math.min(c.width,c.height)*0.026));
  ctx.save();
  ctx.font = `600 ${fs}px system-ui,sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.62)"; ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 5;
  ctx.fillText("L E N S E S", c.width-pad, c.height-pad-fs*1.2);
  ctx.font = `500 ${Math.round(fs*0.82)}px system-ui,sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.fillText("M O T I O 2 E D I T", c.width-pad, c.height-pad);
  ctx.restore(); return c;
}

export function applyLensOpticalEnhanced(
  source: HTMLCanvasElement, lens: CameraLensDef,
  aspectId: LensAspectId = "native", opts?: { watermark?: boolean },
): HTMLCanvasElement {
  let result = applyLensById(source, lens.id, aspectId);
  if (opts?.watermark === true) result = applyFreeLensWatermark(result);
  return result;
}

export function applyLensOptical(
  source: HTMLCanvasElement | HTMLVideoElement, lens: CameraLensDef,
  aspectId: LensAspectId = "native", mirror = false, opts?: { watermark?: boolean },
): HTMLCanvasElement {
  const frame = source instanceof HTMLVideoElement ? captureVideoFrame(source, mirror) : source;
  return applyLensOpticalEnhanced(frame, lens, aspectId, opts);
}

export function nightBoostPreview(src: HTMLCanvasElement, _s = 0.9): HTMLCanvasElement {
  return infrared(src);
}
