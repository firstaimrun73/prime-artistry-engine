/**
 * Auto Edit — Backend Orchestrator
 *
 * SERVER-SIDE ONLY. Never import this on the client.
 *
 * Single entry point that connects:
 *   IMAGE → ANALYSIS → DECISION ENGINE → PLAN → EXECUTION → FINAL IMAGE
 *
 * This file does not implement analysis, decision logic, or generation —
 * it only wires the existing pieces together and executes the plan through
 * the existing generateMedia path. No new FAL integration, no new credit
 * system, no new prompt exposed to the client.
 */

import type { ImageQuality } from "@/lib/quality-options";
import { generateMedia } from "@/lib/generate.functions";

import type {
  ImageAnalysisResult,
  ImageDimensions,
  AutoEditPlan,
  AutoEditStep,
  AutoEditOperation,
} from "./types";
import { AUTO_EDIT_CONFIG, SUPPORTED_IMAGE_TYPES } from "./config";
import { analyzeImage } from "./analyzer";

// ─────────────────────────────────────────────────────────────────────────
// ASSUMPTION — verify this path against the real repo.
// The decision engine's own imports ("../types", "../config") place it one
// folder below src/lib/auto-edit/. If its actual location/filename differs,
// this is the ONLY line that needs to change.
// ─────────────────────────────────────────────────────────────────────────
import { createAutoEditPlan } from "./engine/decision-engine";

// ─────────────────────────────────────────────────────────────────────────
// New constant — not present in the existing config.ts. Auto Edit steps are
// image-to-image edits and need an edit strength. This value is not pulled
// from any existing file; it mirrors the main editor's default (0.7) but
// slightly more conservative since Auto Edit runs unattended. Move this into
// config.ts later if you want it centrally tunable.
// ─────────────────────────────────────────────────────────────────────────
const AUTO_EDIT_EDIT_STRENGTH = 0.65;

// ─────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────

export interface AutoEditStepResult {
  operation: AutoEditOperation;
  applied: boolean;
  confidence: number;
  risk: string;
  /** High-level, UI-safe reason. Never the internal generation prompt. */
  reason: string;
  outputUrl?: string;
  error?: string;
}

export interface AutoEditRunResult {
  success: boolean;
  noChange: boolean;
  noChangeReason?: string;
  analysis: ImageAnalysisResult;
  plan: AutoEditPlan;
  steps: AutoEditStepResult[];
  /** Original URL if NO_CHANGE or every step failed; otherwise the last successful output. */
  finalImageUrl: string;
  changed: boolean;
  /** Count of generation calls actually executed — NOT a credit ledger. Real credit deduction happens inside generateMedia, exactly as it does today. */
  modelCallsUsed: number;
  /** Generic, UI-safe progress log — e.g. "Analyzing image...". Never contains internal prompts. */
  statusMessages: string[];
  error?: string;
}

export interface RunAutoEditInput {
  /** Must already be an https:// URL — this file does not upload files. Reuse the existing upload flow before calling this. */
  imageUrl: string;
  anthropicApiKey: string;
  /** Defaults to "hd". Reuses the existing ImageQuality type/cost system — no new pricing tier introduced. */
  imageQuality?: ImageQuality;
}

// ─────────────────────────────────────────────────────────────────────────
// Dimension probing — self-contained, no new dependency.
// analyzer.ts currently always returns placeholder (0,0) dimensions; this
// orchestrator obtains real dimensions when available and merges them in,
// without modifying analyzer.ts.
// ─────────────────────────────────────────────────────────────────────────

interface ImageProbe {
  dimensions: ImageDimensions | null;
  contentType: string | null;
  byteLength: number;
}

async function probeImage(imageUrl: string): Promise<ImageProbe> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return { dimensions: null, contentType: null, byteLength: 0 };
    const contentType = res.headers.get("content-type");
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      dimensions: parseImageDimensions(buf),
      contentType,
      byteLength: buf.byteLength,
    };
  } catch {
    return { dimensions: null, contentType: null, byteLength: 0 };
  }
}

function toDimensions(width: number, height: number): ImageDimensions | null {
  if (!width || !height) return null;
  return {
    width,
    height,
    aspectRatio: width / height,
    megapixels: parseFloat(((width * height) / 1_000_000).toFixed(2)),
  };
}

function parseImageDimensions(buf: Uint8Array): ImageDimensions | null {
  // PNG
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
    const height = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
    return toDimensions(width, height);
  }

  // JPEG — scan markers for the first SOF segment
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) { offset++; continue; }
      const marker = buf[offset + 1];
      const isSOF =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isSOF) {
        const height = (buf[offset + 5] << 8) | buf[offset + 6];
        const width = (buf[offset + 7] << 8) | buf[offset + 8];
        return toDimensions(width, height);
      }
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const segmentLength = (buf[offset + 2] << 8) | buf[offset + 3];
      offset += 2 + segmentLength;
    }
    return null;
  }

  // WEBP
  if (
    buf.length > 30 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    const fourCC = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (fourCC === "VP8X") {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return toDimensions(width, height);
    }
    if (fourCC === "VP8 ") {
      const width = (buf[27] | (buf[28] << 8)) & 0x3fff;
      const height = (buf[29] | (buf[30] << 8)) & 0x3fff;
      return toDimensions(width, height);
    }
    return null; // VP8L lossless — not parsed, non-critical
  }

  return null;
}

function validateProbe(probe: ImageProbe): string | null {
  if (probe.contentType && !SUPPORTED_IMAGE_TYPES.includes(probe.contentType as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return `Unsupported image type: ${probe.contentType}`;
  }
  if (probe.byteLength > AUTO_EDIT_CONFIG.maxImageSizeBytes) {
    return `Image too large (${(probe.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum is ${(AUTO_EDIT_CONFIG.maxImageSizeBytes / 1024 / 1024).toFixed(0)} MB.`;
  }
  if (probe.dimensions) {
    const { width, height } = probe.dimensions;
    if (width > AUTO_EDIT_CONFIG.maxImageDimensionPx || height > AUTO_EDIT_CONFIG.maxImageDimensionPx) {
      return `Image dimensions too large (max ${AUTO_EDIT_CONFIG.maxImageDimensionPx}px per side).`;
    }
    if (width < AUTO_EDIT_CONFIG.minImageDimensionPx || height < AUTO_EDIT_CONFIG.minImageDimensionPx) {
      return `Image dimensions too small (min ${AUTO_EDIT_CONFIG.minImageDimensionPx}px per side).`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Timeout wrapper
// ─────────────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Step execution — routes through the EXISTING generateMedia path only.
// No second FAL integration. No new credit deduction.
// ─────────────────────────────────────────────────────────────────────────

async function executeStep(
  step: AutoEditStep,
  currentImageUrl: string,
  imageQuality: ImageQuality,
  budget: { remaining: number },
): Promise<AutoEditStepResult> {
  let lastError = "";

  for (let attempt = 0; attempt <= AUTO_EDIT_CONFIG.maxRetriesPerStep; attempt++) {
    if (budget.remaining <= 0) {
      return {
        operation: step.operation,
        applied: false,
        confidence: step.confidence,
        risk: step.risk,
        reason: step.reason,
        error: "Model call budget exceeded for this Auto Edit run.",
      };
    }

    try {
      budget.remaining -= 1;
      const res = await withTimeout(
        // Existing server function — same one the main editor calls.
        // Internal technical prompt (step.requestedChange) is sent here only,
        // never surfaced to the client.
        generateMedia({
          data: {
            prompt: step.requestedChange,
            type: "image",
            imageUrl: currentImageUrl,
            sourceKind: "image",
            strength: AUTO_EDIT_EDIT_STRENGTH,
            maskImageUrl: undefined,
            referenceImageUrls: undefined,
            aspectRatio: undefined,
            imageQuality,
          },
        }),
        AUTO_EDIT_CONFIG.stepTimeoutMs,
        `Auto Edit step ${step.operation}`,
      );

      if (!res?.outputUrl || !res.outputUrl.startsWith("https://")) {
        throw new Error("Generation returned an invalid output URL.");
      }

      return {
        operation: step.operation,
        applied: true,
        confidence: step.confidence,
        risk: step.risk,
        reason: step.reason,
        outputUrl: res.outputUrl,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < AUTO_EDIT_CONFIG.maxRetriesPerStep) {
        await new Promise((r) => setTimeout(r, AUTO_EDIT_CONFIG.retryBaseDelayMs * (attempt + 1)));
      }
    }
  }

  return {
    operation: step.operation,
    applied: false,
    confidence: step.confidence,
    risk: step.risk,
    reason: step.reason,
    error: lastError || "Unknown error executing Auto Edit step.",
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────

export async function runAutoEdit(input: RunAutoEditInput): Promise<AutoEditRunResult> {
  const statusMessages: string[] = [];
  const imageQuality = input.imageQuality ?? "hd";

  if (!input.imageUrl.startsWith("https://")) {
    return emptyFailure(input.imageUrl, statusMessages, "Image URL must be a valid https:// URL.");
  }

  const budget = { remaining: AUTO_EDIT_CONFIG.maxTotalModelCalls };

  // ── Probe + validate ────────────────────────────────────────────────
  statusMessages.push("Analyzing image...");
  const probe = await probeImage(input.imageUrl);
  const validationError = validateProbe(probe);
  if (validationError) {
    return emptyFailure(input.imageUrl, statusMessages, validationError);
  }

  // ── Analysis (existing analyzer.ts, unmodified) ─────────────────────
  if (budget.remaining <= 0) {
    return emptyFailure(input.imageUrl, statusMessages, "Model call budget exhausted before analysis.");
  }
  budget.remaining -= 1;

  let analysis: ImageAnalysisResult;
  try {
    const rawAnalysis = await analyzeImage(input.imageUrl, input.anthropicApiKey);
    analysis = probe.dimensions ? { ...rawAnalysis, dimensions: probe.dimensions } : rawAnalysis;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return emptyFailure(input.imageUrl, statusMessages, message);
  }

  // ── Decision engine (existing, unmodified) ──────────────────────────
  statusMessages.push("Detecting improvements...");
  const plan: AutoEditPlan = createAutoEditPlan(analysis);

  if (plan.steps.length === 0) {
    statusMessages.push("Finalizing...");
    return {
      success: true,
      noChange: true,
      noChangeReason: plan.noChangeReason ?? plan.planSummary,
      analysis,
      plan,
      steps: [],
      finalImageUrl: input.imageUrl,
      changed: false,
      modelCallsUsed: 1, // the analysis call
      statusMessages,
    };
  }

  // ── Sequential execution — output of one step feeds the next ───────
  statusMessages.push("Applying automatic enhancements...");
  const stepResults: AutoEditStepResult[] = [];
  let currentUrl = input.imageUrl;
  let modelCallsUsed = 1; // analysis call already counted

  for (const step of plan.steps) {
    const result = await executeStep(step, currentUrl, imageQuality, budget);
    stepResults.push(result);
    modelCallsUsed = AUTO_EDIT_CONFIG.maxTotalModelCalls - budget.remaining;

    if (!result.applied) {
      // Stop the chain on first failure rather than layering further edits
      // on top of an unknown state. Prior successful steps are preserved.
      statusMessages.push("Finalizing...");
      return {
        success: false,
        noChange: false,
        analysis,
        plan,
        steps: stepResults,
        finalImageUrl: currentUrl,
        changed: currentUrl !== input.imageUrl,
        modelCallsUsed,
        statusMessages,
        error: result.error ?? "Auto Edit step failed.",
      };
    }

    currentUrl = result.outputUrl as string;
  }

  statusMessages.push("Finalizing...");
  return {
    success: true,
    noChange: false,
    analysis,
    plan,
    steps: stepResults,
    finalImageUrl: currentUrl,
    changed: true,
    modelCallsUsed,
    statusMessages,
  };
}

function emptyFailure(
  originalUrl: string,
  statusMessages: string[],
  error: string,
): AutoEditRunResult {
  return {
    success: false,
    noChange: false,
    analysis: undefined as unknown as ImageAnalysisResult,
    plan: undefined as unknown as AutoEditPlan,
    steps: [],
    finalImageUrl: originalUrl,
    changed: false,
    modelCallsUsed: 0,
    statusMessages,
    error,
  };
}