/**
 * Auto Edit vision analysis via fal.ai only.
 * Endpoint: fal-ai/any-llm/vision (google/gemini-2.5-flash-lite).
 * Gemini analyses the photo, decides needed fixes, and writes final_edit_prompt.
 */

import {
  AUTO_EDIT_VISION_LLM,
  AUTO_EDIT_VISION_MODEL,
} from "./constants";
import type { GeminiAutoEditAnalysis } from "./gemini-analysis.types";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const VISION_SYSTEM = `You are a professional photo editor AI. Analyse the single photograph and decide what automatic edits (if any) are needed.

Return ONLY valid JSON with this exact schema:
{
  "image_type": "photo|old_photo|screenshot|portrait|other",
  "issues": ["string"],
  "recommended_actions": ["string"],
  "crop_needed": false,
  "crop_instruction": "string or empty",
  "restoration_needed": false,
  "color_restoration_needed": false,
  "face_improvement_needed": false,
  "background_cleanup_needed": false,
  "distractions_to_remove": ["string"],
  "composition_adjustments": ["string"],
  "preserve_elements": ["identity", "faces", "composition", "natural colors"],
  "confidence": 0.0,
  "no_change": false,
  "final_edit_prompt": "concise editing instruction for an image-editing model"
}

Rules:
- Do NOT blindly apply every enhancement. Only fix real, visible problems.
- Old / faded / B&W / scratched photos: restore, colorize when appropriate, repair damage, preserve identity.
- Blur, noise, compression, exposure, color cast: fix only if clearly present.
- Faces: improve detail/lighting only when needed; NEVER change identity or invent a different person.
- Background: remove only clearly distracting photobombers/objects when warranted.
- Screenshots: if the image is a screenshot of a photo, crop UI/borders and restore the actual photograph when possible.
- Composition: only suggest crop/reframe when framing is clearly poor.
- If the image is already strong and needs no meaningful automatic edit, set no_change=true and final_edit_prompt to "".
- final_edit_prompt must be a concise, high-quality editing instruction describing what to fix/restore/remove/crop/improve and what to preserve. No unrelated objects. No watermark text. Photorealistic natural result.
- confidence is 0–1.
JSON only.`;

async function falVisionRaw(imageUrl: string, falKey: string): Promise<string> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const body = {
    prompt:
      "Analyse this single photograph. Decide what automatic professional edits are actually needed. Return the JSON object as specified in the system prompt, including final_edit_prompt or no_change.",
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

function parseVisionJson(raw: string): Record<string, unknown> {
  const clean = raw
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Vision JSON not found");
  return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").slice(0, 12);
}

function normalizeAnalysis(raw: Record<string, unknown>): GeminiAutoEditAnalysis {
  const noChange = raw.no_change === true;
  let finalPrompt =
    typeof raw.final_edit_prompt === "string" ? raw.final_edit_prompt.trim() : "";
  if (noChange) finalPrompt = "";

  return {
    image_type:
      typeof raw.image_type === "string" ? raw.image_type : "photo",
    issues: asStringArray(raw.issues),
    recommended_actions: asStringArray(raw.recommended_actions),
    crop_needed: raw.crop_needed === true,
    crop_instruction:
      typeof raw.crop_instruction === "string" ? raw.crop_instruction : "",
    restoration_needed: raw.restoration_needed === true,
    color_restoration_needed: raw.color_restoration_needed === true,
    face_improvement_needed: raw.face_improvement_needed === true,
    background_cleanup_needed: raw.background_cleanup_needed === true,
    distractions_to_remove: asStringArray(raw.distractions_to_remove),
    composition_adjustments: asStringArray(raw.composition_adjustments),
    preserve_elements: asStringArray(raw.preserve_elements).length
      ? asStringArray(raw.preserve_elements)
      : ["identity", "faces", "composition", "natural appearance"],
    confidence:
      typeof raw.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
        ? raw.confidence
        : 0.7,
    no_change: noChange || finalPrompt.length < 8,
    final_edit_prompt: finalPrompt,
  };
}

const FALLBACK_POLISH: GeminiAutoEditAnalysis = {
  image_type: "photo",
  issues: [],
  recommended_actions: ["polish"],
  crop_needed: false,
  crop_instruction: "",
  restoration_needed: false,
  color_restoration_needed: false,
  face_improvement_needed: false,
  background_cleanup_needed: false,
  distractions_to_remove: [],
  composition_adjustments: [],
  preserve_elements: ["identity", "faces", "composition", "natural appearance"],
  confidence: 0.4,
  no_change: false,
  final_edit_prompt:
    "Subtly improve overall photographic quality: gentle clarity, natural color balance, and mild exposure refinement only where needed. Preserve identity, faces, composition, and the original scene. Do not add or remove objects. Natural photorealistic result, no watermark.",
};

/**
 * Analyse image with Gemini via fal vision.
 * On failure, falls back to a conservative polish prompt (still runs Kontext).
 */
export async function analyzeImageWithGemini(
  imageUrl: string,
): Promise<GeminiAutoEditAnalysis> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) {
    console.warn("[AutoEdit] FAL_API_KEY missing — conservative polish fallback");
    return FALLBACK_POLISH;
  }

  try {
    const raw = await falVisionRaw(imageUrl, falKey);
    const parsed = parseVisionJson(raw);
    const analysis = normalizeAnalysis(parsed);
    console.log(
      "[AutoEdit] vision:",
      AUTO_EDIT_VISION_MODEL,
      AUTO_EDIT_VISION_LLM,
      "| no_change:",
      analysis.no_change,
      "| confidence:",
      analysis.confidence,
    );
    return analysis;
  } catch (err) {
    console.warn("[AutoEdit] fal vision failed, polish fallback:", err);
    return FALLBACK_POLISH;
  }
}

/** @deprecated Use analyzeImageWithGemini */
export const analyzeImageWithFalVision = analyzeImageWithGemini;
