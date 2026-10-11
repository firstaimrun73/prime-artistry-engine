/**
 * Auto Edit vision analysis via fal.ai only.
 * Endpoint: fal-ai/any-llm/vision (google/gemini-2.5-flash-lite).
 * Gemini analyses the photo, decides needed fixes, and writes final_edit_prompt.
 * Maluto AI 1.8 — deep automatic restoration / correction analysis.
 */

import {
  AUTO_EDIT_VISION_LLM,
  AUTO_EDIT_VISION_MODEL,
} from "./constants";
import type { GeminiAutoEditAnalysis } from "./gemini-analysis.types";

const FAL_QUEUE = "https://queue.fal.run/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deep one-click restoration analysis system prompt (Maluto AI 1.8). */
export const VISION_SYSTEM = `You are Maluto AI 1.8, Motio2edit's professional automatic photo restoration and correction analyst.
Analyse the ENTIRE single photograph. Decide which corrections are actually needed. Users never write prompts or pick categories — you must choose operations automatically.

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
  "preserve_elements": ["identity", "faces", "skin_tone", "pose", "clothing", "composition", "natural colors"],
  "confidence": 0.0,
  "no_change": false,
  "final_edit_prompt": "concise, complete editing instruction for an image-editing model"
}

DEEP ANALYSIS — check every category and list only real visible problems in issues[]:
1) Old-photo restoration: scratches, tears, creases, dust, stains, fading, missing or damaged regions.
2) B&W / faded colorization when appropriate (set color_restoration_needed=true).
3) Lighting: exposure, shadows, highlights, uneven lighting, underexposed faces — do not lighten natural dark skin.
4) Blur, noise, compression, softness, detail recovery — no plastic skin or invented faces.
5) Color casts, white balance, contrast, natural saturation.
6) Portrait: improve face only when needed; never change identity, age, expression, clothing.
7) Background: only clearly distracting unwanted objects — never remove people or meaningful subjects.
8) Composition: preserve full image and aspect unless crop is clearly required.

final_edit_prompt rules:
- Single coherent instruction covering ALL needed repairs so nothing is lost.
- Preserve identity, faces, age, expression, skin tone (including dark skin), pose, body shape, clothing, objects, composition.
- Forbid plastic skin, artificial colors, invented details, excessive sharpening, aspect changes, watermarks, removing people.
- Reconstruct damaged regions naturally.
- no_change=true only when image truly needs no meaningful automatic edit; NEVER when visible defects exist.
- confidence is 0–1.
JSON only.`;

async function falVisionRaw(imageUrl: string, falKey: string): Promise<string> {
  const headers = {
    Authorization: `Key ${falKey}`,
    "Content-Type": "application/json",
  };
  const body = {
    prompt:
      "Analyse this entire photograph for Maluto AI 1.8 automatic restoration. Identify real defects. Return JSON including a complete final_edit_prompt covering every needed repair, or no_change only when no meaningful automatic edit is needed.",
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

export function parseVisionJson(raw: string): Record<string, unknown> {
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

export function hasVisibleWorkSignals(raw: Record<string, unknown>): boolean {
  if (raw.restoration_needed === true) return true;
  if (raw.color_restoration_needed === true) return true;
  if (raw.face_improvement_needed === true) return true;
  if (raw.background_cleanup_needed === true) return true;
  if (raw.crop_needed === true) return true;
  if (asStringArray(raw.issues).length > 0) return true;
  if (asStringArray(raw.recommended_actions).length > 0) return true;
  if (asStringArray(raw.distractions_to_remove).length > 0) return true;
  const imageType = typeof raw.image_type === "string" ? raw.image_type.toLowerCase() : "";
  if (imageType === "old_photo") return true;
  return false;
}

export function synthesizeEditPrompt(raw: Record<string, unknown>): string {
  const parts: string[] = [];
  const issues = asStringArray(raw.issues);
  const distractions = asStringArray(raw.distractions_to_remove);

  if (raw.restoration_needed === true || String(raw.image_type).toLowerCase() === "old_photo") {
    parts.push(
      "Restore this photograph: repair scratches, tears, creases, dust, stains, fading, and damaged regions naturally from surrounding context",
    );
  }
  if (raw.color_restoration_needed === true) {
    parts.push(
      "Colorize black-and-white or heavily faded areas with realistic natural colors appropriate to the era and scene",
    );
  }
  if (issues.some((i) => /underexpose|overexpose|exposure|shadow|highlight|lighting|low.?light/i.test(i))) {
    parts.push(
      "Correct exposure, shadows, highlights, and uneven lighting; lift underexposed faces without lightening natural dark skin tones",
    );
  }
  if (issues.some((i) => /blur|noise|compress|soft|pixel|artifact|detail/i.test(i))) {
    parts.push(
      "Recover sharpness and detail; reduce blur, noise, and compression artifacts without plastic skin or invented facial features",
    );
  }
  if (issues.some((i) => /color.?cast|white.?balance|fad|saturation|contrast/i.test(i))) {
    parts.push("Correct color cast, white balance, contrast, and natural saturation");
  }
  if (raw.face_improvement_needed === true) {
    parts.push(
      "Improve portrait face clarity and lighting only where needed while preserving identity, age, expression, and skin tone",
    );
  }
  if (raw.background_cleanup_needed === true || distractions.length > 0) {
    const list = distractions.length ? distractions.join(", ") : "clearly distracting unwanted objects only";
    parts.push(
      `Remove only clearly distracting unwanted elements (${list}); never remove people or meaningful subjects`,
    );
  }
  if (raw.crop_needed === true && typeof raw.crop_instruction === "string" && raw.crop_instruction.trim()) {
    parts.push(`Framing: ${raw.crop_instruction.trim()}`);
  } else if (issues.length && parts.length === 0) {
    parts.push(`Address these photographic issues: ${issues.join("; ")}`);
  }

  if (parts.length === 0) return "";

  parts.push(
    "Preserve identity, faces, age, expression, skin tone (including naturally dark skin), pose, body shape, clothing, important objects, full composition, and original aspect ratio",
  );
  parts.push(
    "Natural photorealistic result; no plastic skin, artificial colors, invented details, excessive sharpening, watermarks, or text",
  );
  return parts.join(". ") + ".";
}

export function normalizeGeminiAnalysis(raw: Record<string, unknown>): GeminiAutoEditAnalysis {
  let finalPrompt =
    typeof raw.final_edit_prompt === "string" ? raw.final_edit_prompt.trim() : "";

  const workSignals = hasVisibleWorkSignals(raw);
  let noChange = raw.no_change === true && !workSignals;

  if (workSignals && finalPrompt.length < 12) {
    const synthesized = synthesizeEditPrompt(raw);
    if (synthesized.length >= 12) {
      finalPrompt = synthesized;
      noChange = false;
    }
  }

  if (noChange) finalPrompt = "";
  if (!noChange && finalPrompt.length < 8 && !workSignals) {
    noChange = true;
    finalPrompt = "";
  }
  if (workSignals && finalPrompt.length < 8) {
    finalPrompt =
      "Restore and correct visible photographic defects (damage, fading, exposure, blur, noise, color) while preserving identity, faces, skin tone, composition, and the full original frame. Natural photorealistic result, no watermark.";
    noChange = false;
  }

  return {
    image_type: typeof raw.image_type === "string" ? raw.image_type : "photo",
    issues: asStringArray(raw.issues),
    recommended_actions: asStringArray(raw.recommended_actions),
    crop_needed: raw.crop_needed === true,
    crop_instruction: typeof raw.crop_instruction === "string" ? raw.crop_instruction : "",
    restoration_needed: raw.restoration_needed === true,
    color_restoration_needed: raw.color_restoration_needed === true,
    face_improvement_needed: raw.face_improvement_needed === true,
    background_cleanup_needed: raw.background_cleanup_needed === true,
    distractions_to_remove: asStringArray(raw.distractions_to_remove),
    composition_adjustments: asStringArray(raw.composition_adjustments),
    preserve_elements: asStringArray(raw.preserve_elements).length
      ? asStringArray(raw.preserve_elements)
      : ["identity", "faces", "skin_tone", "pose", "clothing", "composition", "natural appearance"],
    confidence:
      typeof raw.confidence === "number" && raw.confidence >= 0 && raw.confidence <= 1
        ? raw.confidence
        : 0.7,
    no_change: noChange,
    final_edit_prompt: finalPrompt,
  };
}

export const FALLBACK_POLISH: GeminiAutoEditAnalysis = {
  image_type: "photo",
  issues: ["analysis_incomplete"],
  recommended_actions: ["conservative_restoration_polish"],
  crop_needed: false,
  crop_instruction: "",
  restoration_needed: false,
  color_restoration_needed: false,
  face_improvement_needed: false,
  background_cleanup_needed: false,
  distractions_to_remove: [],
  composition_adjustments: [],
  preserve_elements: [
    "identity",
    "faces",
    "skin_tone",
    "pose",
    "clothing",
    "composition",
    "natural appearance",
  ],
  confidence: 0.35,
  no_change: false,
  final_edit_prompt:
    "Perform a careful automatic photo correction pass: repair any visible damage, fading, scratches, or dust if present; correct obvious exposure, color cast, blur, or noise problems; colorize only if the photo is clearly black-and-white and colorization is appropriate. Preserve identity, faces, age, expression, natural skin tone (including dark skin), pose, clothing, important objects, full composition, and original aspect ratio. Do not remove people or meaningful objects. Natural photorealistic result, no plastic skin, no invented details, no watermark.",
};

export async function analyzeImageWithGemini(
  imageUrl: string,
): Promise<GeminiAutoEditAnalysis> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) {
    console.warn("[AutoEdit] FAL_API_KEY missing — conservative polish fallback");
    return { ...FALLBACK_POLISH };
  }

  try {
    const rawText = await falVisionRaw(imageUrl, falKey);
    const parsed = parseVisionJson(rawText);
    const analysis = normalizeGeminiAnalysis(parsed);
    console.log(
      "[AutoEdit] vision:",
      AUTO_EDIT_VISION_MODEL,
      AUTO_EDIT_VISION_LLM,
      "| no_change:",
      analysis.no_change,
      "| confidence:",
      analysis.confidence,
      "| restoration:",
      analysis.restoration_needed,
      "| colorize:",
      analysis.color_restoration_needed,
    );
    return analysis;
  } catch (err) {
    console.warn("[AutoEdit] fal vision failed, polish fallback:", err);
    return { ...FALLBACK_POLISH };
  }
}

/** @deprecated Use analyzeImageWithGemini */
export const analyzeImageWithFalVision = analyzeImageWithGemini;
