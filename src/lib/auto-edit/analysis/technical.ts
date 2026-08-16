/**
 * Minimal technical analysis to produce a QualityAnalysis compatible object.
 * The real project may have a much more sophisticated implementation; this
 * function provides a small, deterministic summary derived from plain text
 * so the analysis foundation compiles and behaves conservatively.
 */
import type { ImageDimensions, QualityAnalysis } from "../types";

export function buildQualityAnalysis(plainText: string, dims: ImageDimensions): QualityAnalysis {
  const t = (plainText ?? "").toLowerCase();
  const issues: string[] = [];
  const restorationIssues: string[] = [];

  if (/blur|blurry|out of focus|soft focus/.test(t)) issues.push("blur");
  if (/motion blur/.test(t)) issues.push("motion_blur");
  if (/noise|grain/.test(t)) issues.push("noise");
  if (/compression|artifact|jpeg/.test(t)) issues.push("compression_artifacts");
  if (/pixel|pixelation/.test(t)) issues.push("pixelation");
  if (/overexpos|too bright|washed out|blown highlight/.test(t)) issues.push("overexposed");
  if (/underexpos|too dark|low light|underexposed/.test(t)) issues.push("underexposed");
  if (/low contrast/.test(t)) issues.push("low_contrast");
  if (/color cast|colour cast|white balance/.test(t)) issues.push("color_cast");
  if (/low resolution|too small|small image/.test(t) || dims.megapixels > 0 && dims.megapixels < 0.3) issues.push("low_resolution");

  if (/fading|fade|faded|yellowing/.test(t)) restorationIssues.push("fading");
  if (/scratch|scratched|scratch/.test(t)) restorationIssues.push("scratches");
  if (/crack|cracked/.test(t)) restorationIssues.push("cracks");
  if (/dust|speckle|speckles/.test(t)) restorationIssues.push("dust");
  if (/stain|stained/.test(t)) restorationIssues.push("stains");
  if (/tear|torn/.test(t)) restorationIssues.push("tears");
  if (/damaged region|torn background|damaged region/.test(t)) restorationIssues.push("damaged_regions");

  const isOldPhoto = /old photo|vintage|aged|antique|sepia|yellowed/.test(t);

  // Naive scoring: start at 1.0 and subtract for each issue.
  let score = 1.0;
  score -= Math.min(issues.length * 0.08, 0.6);
  score -= Math.min(restorationIssues.length * 0.06, 0.5);
  if (isOldPhoto) score -= 0.05;
  if (score < 0) score = 0;

  return {
    issues,
    restorationIssues,
    isOldPhoto,
    overallScore: Math.round(score * 100) / 100,
  };
}
