/****
 * Auto Edit — Main Image Analyzer
 *
 * SERVER-SIDE ONLY. Never import this on the client.
 * Calls Anthropic claude-sonnet-4-5 vision to deeply analyze an uploaded image.
 * Returns a fully structured ImageAnalysisResult.
 */
import type { ImageAnalysisResult, ImageDimensions } from "./types";
import { ANALYSIS_MODEL, ANALYSIS_MAX_TOKENS } from "./config";
import { classifyScene } from "./analysis/scene";
import { analyzePeople, analyzeFaces } from "./analysis/people";
import { analyzeBackground, analyzeLighting } from "./analysis/lighting";
import { buildQualityAnalysis } from "./analysis/technical";

const VISION_SYSTEM_PROMPT = `You are a professional photo analyst and image quality expert.Analyze the provided image in complete technical detail.Your response MUST be structured JSON with this exact schema:{ "scene": "description of the scene type", "peopleCount": 0, "hasPrimarySubject": true, "hasBackgroundPeople": false, "hasPhotobombers": false, "hasPartiallyVisiblePeople": false, "faceDetected": true, "faceCount": 1, "faceBlurry": false, "faceHasArtifacts": false, "redEye": false, "facePoorLighting": false, "faceOccluded": false, "isOldPhoto": false, "isNightPhoto": false, "isLowLight": false, "qualityIssues": [], "restorationIssues": [], "backgroundCluttered": false, "backgroundHasDistractingElements": false, "backgroundHasUnwantedObjects": false, "lightingUnderexposed": false, "lightingOverexposed": false, "lightingUneven": false, "colorTemperatureOff": false, "overallQualityScore": 0.8, "analysisConfidence": 0.9, "plainTextSummary": "A brief plain text description of the main issues and what can be improved."}qualityIssues can include: blur, motion_blur, defocus, noise, compression_artifacts, pixelation, overexposed, underexposed, low_contrast, color_cast, oversharpened, low_resolution, missing_detailrestorationIssues can include: fading, scratches, cracks, dust, stains, tears, damaged_regions, monochrome_aged, color_lossBe accurate. Do not hallucinate problems that are not present.If the image is in good condition, return overallQualityScore close to 1.0.Return ONLY the JSON object — no markdown, no explanation.`.trim();

interface VisionJSON {
  scene?: string;
  peopleCount?: number;
  hasPrimarySubject?: boolean;
  hasBackgroundPeople?: boolean;
  hasPhotobombers?: boolean;
  hasPartiallyVisiblePeople?: boolean;
  faceDetected?: boolean;
  faceCount?: number;
  faceBlurry?: boolean;
  faceHasArtifacts?: boolean;
  redEye?: boolean;
  facePoorLighting?: boolean;
  faceOccluded?: false;
  isOldPhoto?: boolean;
  isNightPhoto?: boolean;
  isLowLight?: boolean;
  qualityIssues?: string[];
  restorationIssues?: string[];
  backgroundCluttered?: boolean;
  backgroundHasDistractingElements?: boolean;
  backgroundHasUnwantedObjects?: boolean;
  lightingUnderexposed?: boolean;
  lightingOverexposed?: boolean;
  lightingUneven?: boolean;
  colorTemperatureOff?: boolean;
  overallQualityScore?: number;
  analysisConfidence?: number;
  plainTextSummary?: string;
}

async function callAnthropicVision(
  imageUrl: string,
  anthropicApiKey: string,
): Promise<VisionJSON> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      max_tokens: ANALYSIS_MAX_TOKENS,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            { type: "text", text: "Analyze this image completely and return the JSON object as specified." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown");
    throw new Error(`Anthropic vision API failed (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error("Anthropic returned no text content.");

  let parsed: VisionJSON;
  try {
    const clean = textBlock.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    parsed = JSON.parse(clean) as VisionJSON;
  } catch {
    console.error("[AutoEdit] Failed to parse vision JSON:", textBlock.text.slice(0, 300));
    throw new Error("Vision analysis returned invalid JSON.");
  }

  return parsed;
}

function placeholderDimensions(): ImageDimensions {
  return {
    width: 0,
    height: 0,
    aspectRatio: 1,
    megapixels: 0,
  };
}

export async function analyzeImage(
  imageUrl: string,
  anthropicApiKey: string,
): Promise<ImageAnalysisResult> {
  if (!imageUrl.startsWith("https://")) {
    throw new Error("Image URL must be a valid https:// URL for analysis.");
  }

  let visionData: VisionJSON;
  try {
    visionData = await callAnthropicVision(imageUrl, anthropicApiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Image analysis failed: ${msg}`);
  }

  const plainText = visionData.plainTextSummary ?? JSON.stringify(visionData);

  const scene = classifyScene(`${visionData.scene ?? ""} ${plainText}`);

  const people = {
    count: visionData.peopleCount ?? 0,
    hasPrimarySubject: visionData.hasPrimarySubject ?? false,
    hasSecondaryPeople:
      (visionData.peopleCount ?? 0) > 1 || (visionData.hasBackgroundPeople ?? false) || (visionData.hasPhotobombers ?? false),
    hasBackgroundPeople: visionData.hasBackgroundPeople ?? false,
    hasPhotobombers: visionData.hasPhotobombers ?? false,
    hasPartiallyVisiblePeople: visionData.hasPartiallyVisiblePeople ?? false,
  };

  const faces = {
    detected: visionData.faceDetected ?? false,
    count: visionData.faceCount ?? 0,
    primaryFaceVisible: (visionData.faceDetected ?? false) && !(visionData.faceOccluded ?? false),
    blurry: visionData.faceBlurry ?? false,
    hasArtifacts: visionData.faceHasArtifacts ?? false,
    redEye: visionData.redEye ?? false,
    poorLighting: visionData.facePoorLighting ?? false,
    occluded: visionData.faceOccluded ?? false,
  };

  const background = {
    isCluttered: visionData.backgroundCluttered ?? false,
    hasDistractingElements: visionData.backgroundHasDistractingElements ?? false,
    hasUnwantedObjects: visionData.backgroundHasUnwantedObjects ?? false,
    hasDamagedRegions: false,
    hasInconsistentLighting: false,
  };

  const lighting = {
    isUnderexposed: visionData.lightingUnderexposed ?? false,
    isOverexposed: visionData.lightingOverexposed ?? false,
    isUneven: visionData.lightingUneven ?? false,
    hasHighlightClipping: visionData.lightingOverexposed ?? false,
    hasShadowClipping: visionData.lightingUnderexposed ?? false,
    colorTemperatureOff: visionData.colorTemperatureOff ?? false,
  };

  const quality = buildQualityAnalysis(plainText, placeholderDimensions());

  const mergedIssues = [
    ...quality.issues,
    ...(visionData.qualityIssues ?? []).filter((i) => !quality.issues.includes(i as typeof quality.issues[number])),
  ] as typeof quality.issues;

  const mergedRestoration = [
    ...quality.restorationIssues,
    ...(visionData.restorationIssues ?? []).filter(
      (i) => !quality.restorationIssues.includes(i as typeof quality.restorationIssues[number]),
    ),
  ] as typeof quality.restorationIssues;

  const isOldPhoto = visionData.isOldPhoto ?? quality.isOldPhoto;

  return {
    dimensions: placeholderDimensions(),
    scene,
    people,
    faces,
    background,
    quality: {
      overallScore: visionData.overallQualityScore ?? quality.overallScore,
      issues: mergedIssues,
      restorationIssues: mergedRestoration,
      isOldPhoto,
      needsRestoration: isOldPhoto || mergedRestoration.length > 0,
      needsEnhancement: mergedIssues.length > 0,
    },
    lighting,
    composition: {
      horizonStraight: true,
      subjectWellPlaced: true,
      hasEdgeDistractions: false,
      hasExcessiveEmptySpace: false,
    },
    analysisConfidence: visionData.analysisConfidence ?? 0.75,
    rawVisionResponse: plainText,
  };
}
