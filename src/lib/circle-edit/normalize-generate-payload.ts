/**
 * Circle 2edit client historically sent maskImageUrl + circleAssetId.
 * generateMedia schema/handler primarily read maskUrl + circleAddAsset.
 * Without this map, Remove/Add fell through to plain image-edit (no mask)
 * and could return an unedited-looking or original image.
 */

export type CircleNormalizedPayload = {
  maskUrl: string | null;
  circleAddAsset: string | null;
  isCircleRemove: boolean;
  isCircleAdd: boolean;
};

export function normalizeCircleGeneratePayload(data: {
  imageUrl?: string | null;
  maskUrl?: string | null;
  maskImageUrl?: string | null;
  circleInstant?: boolean | null;
  circleAddAsset?: string | null;
  circleAssetId?: string | null;
}): CircleNormalizedPayload {
  const maskUrl =
    (typeof data.maskImageUrl === "string" && data.maskImageUrl.startsWith("http")
      ? data.maskImageUrl
      : null) ||
    (typeof data.maskUrl === "string" && data.maskUrl.startsWith("http") ? data.maskUrl : null);

  const circleAddAsset =
    (typeof data.circleAddAsset === "string" && data.circleAddAsset.length > 0
      ? data.circleAddAsset
      : null) ||
    (typeof data.circleAssetId === "string" && data.circleAssetId.length > 0
      ? data.circleAssetId
      : null);

  const hasImage = typeof data.imageUrl === "string" && data.imageUrl.startsWith("http");
  const hasMask = !!maskUrl;

  const isCircleRemove = data.circleInstant === true && hasImage && hasMask;
  const isCircleAdd = data.circleInstant === false && hasImage && hasMask;

  return { maskUrl, circleAddAsset, isCircleRemove, isCircleAdd };
}
