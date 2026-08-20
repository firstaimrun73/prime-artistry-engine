/**
 * Auto Edit vision analysis via fal.ai only.
 * Endpoint: fal-ai/any-llm/vision (default google/gemini-2.5-flash-lite ~$0.01).
 * No Anthropic, OpenAI, or ChatGPT API keys.
 */

import type { ImageAnalysisResult } from "./types";
import { AUTO_EDIT_VISION_LLM, AUTO_EDIT_VISION_MODEL } from "./constants";
import { buildRuleBasedAnalysis } from "./ruleBasedAnalysis";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const VISION_SYSTEM = `You are a professional photo analyst. Analyze the image and return ONLY valid JSON with this schema:
{
  "scene": "string",
  "peopleCount": 0,
  "hasPrimarySubject": true,
  "hasBackgroundPeople": false,
  "hasPhotobombers": false,
  "faceDetected": true,
  "faceCount": 1,
  "faceBlurry": false,
  "isOldPhoto": false,
  "isLowLight": false,
  "qualityIssues": [],
  "restorationIssues": [],
  "backgroundCluttered": false,
  "backgroundHasDistractingElements": false,
  "lightingUnderexposed": false,
  "lightingOverexposed": false,
  "lightingUneven": false,
  "colorTemperatureOff": false,
  "overallQualityScore": 0.8,
  "analysisConfidence": 0.9,
  "plainTextSummary": "brief summary of issues and improvements"
}
qualityIssues may include: blur, motion_blur, defocus, noise, compression_artifacts, pixelation, overexposed, underexposed, low_contrast, color_cast, oversharpened, low_resolution, missing_detail
restorationIssues may include: fading, scratches, cracks, dust, stains, tears, damaged_regions, monochrome_aged, color_loss
Do not invent problems. If the photo is strong, overallQualityScore near 1.0. JSON only.`;

type VisionJSON = {
  scene?: string;
  peopleCount?: number;
  hasPrimarySubject?: boolean;
  hasBackgroundPeople?: boolean;
  hasPhotobombers?: boolean;
  faceDetected?: boolean;
  faceCount?: number;
  faceBlurry?: boolean;
  isOldPhoto?: boolean;
  isLowLight?: boolean;
  qualityIssues?: string[];
  restorationIssues?: string[];
  backgroundCluttered?: boolean;
  backgroundHasDistractingElements?: boolean;
  lightingUnderexposed?: boolean;
  lightingOverexposed?: boolean;
  lightingUneven?: boolean;
  colorTemperatureOff?: boolean;
  overallQualityScore?: number;
  analysisConfidence?: number;
  plainTextSummary?: string;
};

async function falVisionRaw(imageUrl: string, falKey: string): Promise<string> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const body = {
    prompt:
      "Analyze this photograph for quality issues, restoration needs, faces, background clutter, and lighting. Return the JSON object as specified in the system prompt.",
    system_prompt: VISION_SYSTEM,
    image_url: imageUrl,
    model: AUTO_EDIT_VISION_LLM,
  };

  const submit = await fetch(`${FAL_QUEUE}${AUTO_EDIT_VISION_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const txt = await submit.text();
    throw new Error(`Vision analyse failed (${submit.status}): ${txt.slice(0, 160)}`);
  }

  const { status_url, response_url } = (await submit.json()) as {
    status_url: string;
    response_url: string;
  };

  const deadline = Date.now() + 90_000;
  let delay = 800;
  let last = "";
  while (Date.now() < deadline) {
    await sleep(delay);
    const st = await fetch(status_url, { headers });
    if (!st.ok) {
      delay = Math.min(delay * 1.4, 4000);
      continue;
    }
    const sj = (await st.json()) as { status?: string };
    if (sj.status) last = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      throw new Error("Vision analyse job failed on fal.");
    }
    delay = Math.min(delay * 1.4, 4000);
  }
  if (last !== "COMPLETED") throw new Error("Vision analyse timed out.");

  const res = await fetch(response_url, { headers });
  if (!res.ok) throw new Error(`Vision result fetch failed (${res.status})`);
  const json = (await res.json()) as { output?: string; text?: string; response?: string };
  const text = json.output ?? json.text ?? json.response ?? "";
  if (!text) throw new Error("Vision returned empty response.");
  return text;
}

function parseVisionJson(raw: string): VisionJSON {
  const clean = raw
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Vision JSON not found");
  return JSON.parse(clean.slice(start, end + 1)) as VisionJSON;
}

function visionToAnalysis(
  v: VisionJSON,
  dims?: { width?: number; height?: number },
): ImageAnalysisResult {
  const width = dims?.width && dims.width > 0 ? dims.width : 0;
  const height = dims?.height && dims.height > 0 ? dims.height : 0;
  const megapixels = width > 0 && height > 0 ? (width * height) / 1_000_000 : 0;
  const aspectRatio = height > 0 ? width / height : 1;

  const issues = [...(v.qualityIssues ?? [])];
  const restorationIssues = [...(v.restorationIssues ?? [])];
  const isOld = v.isOldPhoto ?? false;

  return {
    dimensions: { width, height, aspectRatio, megapixels },
    scene: (v.scene as ImageAnalysisResult["scene"]) || "other",
    people: {
      count: v.peopleCount ?? 0,
      hasPrimarySubject: v.hasPrimarySubject ?? true,
      hasSecondaryPeople: (v.peopleCount ?? 0) > 1 || !!v.hasBackgroundPeople,
      hasBackgroundPeople: v.hasBackgroundPeople ?? false,
      hasPhotobombers: v.hasPhotobombers ?? false,
      hasPartiallyVisiblePeople: false,
    },
    faces: {
      detected: v.faceDetected ?? false,
      count: v.faceCount ?? 0,
      primaryFaceVisible: !!(v.faceDetected && (v.faceCount ?? 0) > 0),
      blurry: v.faceBlurry ?? false,
      hasArtifacts: false,
      redEye: false,
      poorLighting: !!(v.isLowLight && v.faceDetected),
      occluded: false,
    },
    background: {
      isCluttered: v.backgroundCluttered ?? false,
      hasDistractingElements: v.backgroundHasDistractingElements ?? false,
      hasUnwantedObjects: v.backgroundHasDistractingElements ?? false,
      hasDamagedRegions: restorationIssues.length > 0,
      hasInconsistentLighting: v.lightingUneven ?? false,
    },
    quality: {
      issues,
      restorationIssues,
      isOldPhoto: isOld,
      overallScore: typeof v.overallQualityScore === "number" ? v.overallQualityScore : 0.7,
      needsRestoration: isOld || restorationIssues.length > 0,
      needsEnhancement: issues.length > 0 || restorationIssues.length > 0,
    },
    lighting: {
      isUnderexposed: v.lightingUnderexposed ?? false,
      isOverexposed: v.lightingOverexposed ?? false,
      isUneven: v.lightingUneven ?? false,
      hasHighlightClipping: v.lightingOverexposed ?? false,
      hasShadowClipping: v.lightingUnderexposed ?? false,
      colorTemperatureOff: v.colorTemperatureOff ?? false,
    },
    composition: {
      horizonStraight: true,
      subjectWellPlaced: true,
      hasEdgeDistractions: false,
      hasExcessiveEmptySpace: false,
    },
    analysisConfidence:
      typeof v.analysisConfidence === "number" ? v.analysisConfidence : 0.8,
    rawVisionResponse: v.plainTextSummary ?? JSON.stringify(v),
  };
}

/**
 * Analyse image with fal vision; falls back to rule-based heuristics on failure.
 */
export async function analyzeImageWithFalVision(
  imageUrl: string,
  dims?: { width?: number; height?: number },
): Promise<ImageAnalysisResult> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) {
    console.warn("[AutoEdit] FAL_API_KEY missing — rule-based analysis only");
    return buildRuleBasedAnalysis({ width: dims?.width, height: dims?.height });
  }

  try {
    const raw = await falVisionRaw(imageUrl, falKey);
    const parsed = parseVisionJson(raw);
    console.log("[AutoEdit] vision model:", AUTO_EDIT_VISION_MODEL, AUTO_EDIT_VISION_LLM);
    return visionToAnalysis(parsed, dims);
  } catch (err) {
    console.warn("[AutoEdit] fal vision failed, rule-based fallback:", err);
    return buildRuleBasedAnalysis({ width: dims?.width, height: dims?.height });
  }
}
