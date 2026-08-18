/** Compatibility facade — prefer @/lib/watermark (finalizeMediaAsset). */
export type { WatermarkMode } from "@/lib/policy";
export {
  renderImageWatermark as applyServerWatermark,
  fetchMediaBuffer as fetchImageBuffer,
  buildImageOverlaySvg,
} from "@/lib/watermark/image";
export { finalizeMediaAsset, PREPARE_FAILED } from "@/lib/watermark/finalize";
export { resolveWatermarkPolicy } from "@/lib/watermark/policy";
