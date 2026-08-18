export type { WatermarkMode, MediaKind, WatermarkPolicy, FinalizeMediaInput, FinalizeMediaResult } from "./types";
export { FINALIZED_PATH_MARKER, FINALIZED_VIDEO_MARKER } from "./types";
export { resolveWatermarkPolicy, policyRequiresStamp } from "./policy";
export { finalizeMediaAsset, PREPARE_FAILED } from "./finalize";
export { renderImageWatermark, fetchMediaBuffer, buildImageOverlaySvg } from "./image";
export { renderVideoWatermark } from "./video";
