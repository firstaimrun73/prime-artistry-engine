/**
 * Auto Edit — Backend Orchestrator (SERVER-SIDE composition)
 *
 * Wires EXISTING modules only:
 *   probe/validate → analyzeImage (analyze.server)
 *                 → buildAutoEditPlan (decision)
 *                 → buildStepForOperation (execute)
 *                 → generate callback (existing generateMedia from the app)
 *
 * Does not implement a second FAL path, credit ledger, or analysis schema.
 * Intermediate outputs stay internal; watermark remains at generateMedia /
 * secure download call sites.
 *
 * Never import this on the client.
 */

import type { ImageQuality } from "@/lib/quality-options";
import type { ImageAnalysisResult, ImageDimensions } from "./types";
import {
  AUTO_EDIT_CONFIG,
  SUPPORTED_IMAGE_TYPES,
} from "./config";
import { analyzeImage } from "./analyze.server";
import {
  automaticOperationsInOrder,
  buildAutoEditPlan,
  type AutoEditPlan,
} from "./decision";
import {
  buildStepForOperation,
  type AutoEditStepInput,
} from "./execute";
import type { AutoEditOperationId } from "./operations";

// ─────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────

export type AutoEditGenerateFn = (
  step: AutoEditStepInput,
) => Promise<{ outputUrl: string }>;

export interface AutoEditStepResult {
  operationId: AutoEditOperationId;
  title: string;
  applied: boolean;
  /** UI-safe reason — never the internal generation prompt. */
  reason: string;
  outputUrl?: string;
  error?: string;
}

export interface AutoEditRunResult {
  success: boolean;
  noChange: boolean;
  noChangeReason?: string;
  /** Present after successful analysis; omitted on pre-analysis failures. */
  analysis?: ImageAnalysisResult;
  /** Present after successful analysis; omitted on pre-analysis failures. */
  plan?: AutoEditPlan;
  steps: AutoEditStepResult[];
  /** Original URL if NO_CHANGE or every step failed; otherwise last successful output. */
  finalImageUrl: string;
  changed: boolean;
  /** Count of generation calls executed — not a credit ledger. */
  modelCallsUsed: number;
  /** Generic UI-safe progress log. Never contains internal prompts. */
  statusMessages: string[];
  error?: string;
}

export interface RunAutoEditInput {
  /** Must already be https:// — upload happens in the existing UI/storage flow. */
  imageUrl: string;
  anthropicApiKey: string;
  /** Defaults to "hd". Reuses existing ImageQuality cost system. */
  imageQuality?: ImageQuality;
  /** Optional client-known pixel size (preferred over probe). */
  width?: number;
  height?: number;
  /**
   * Adapter that calls the existing generateMedia server function.
   * Required so this module never invents a second generation pipeline
   * and so auth/credit context stays with the app call site.
   */
  generate: AutoEditGenerateFn;
}

// ─────────────────────────────────────────────────────────────────────────
// Dimension probing
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

  // JPEG — first SOF segment
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
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
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const segmentLength = (buf[offset + 2] << 8) | buf[offset + 3];
      offset += 2 + segmentLength;
    }
    return null;
  }

  // WEBP
  if (
    buf.length > 30 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
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
    return null;
  }

  return null;
}

function validateProbe(probe: ImageProbe): string | null {
  if (
    probe.contentType &&
    !SUPPORTED_IMAGE_TYPES.includes(probe.contentType as (typeof SUPPORTED_IMAGE_TYPES)[number])
  ) {
    // Some CDNs omit subtype precision; only fail hard on clearly non-image types
    if (!probe.contentType.startsWith("image/")) {
      return `Unsupported image type: ${probe.contentType}`;
    }
  }
  if (probe.byteLength > AUTO_EDIT_CONFIG.maxImageSizeBytes) {
    return `Image too large (${(probe.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum is ${(AUTO_EDIT_CONFIG.maxImageSizeBytes / 1024 / 1024).toFixed(0)} MB.`;
  }
  if (probe.dimensions) {
    const { width, height } = probe.dimensions;
    if (
      width > AUTO_EDIT_CONFIG.maxImageDimensionPx ||
      height > AUTO_EDIT_CONFIG.maxImageDimensionPx
    ) {
      return `Image dimensions too large (max ${AUTO_EDIT_CONFIG.maxImageDimensionPx}px per side).`;
    }
    if (
      width < AUTO_EDIT_CONFIG.minImageDimensionPx ||
      height < AUTO_EDIT_CONFIG.minImageDimensionPx
    ) {
      return `Image dimensions too small (min ${AUTO_EDIT_CONFIG.minImageDimensionPx}px per side).`;
    }
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Step execution — only through injected generate (existing generateMedia)
// ─────────────────────────────────────────────────────────────────────────

async function executeStep(
  opId: AutoEditOperationId,
  title: string,
  reason: string,
  currentImageUrl: string,
  imageQuality: ImageQuality,
  generate: AutoEditGenerateFn,
  budget: { remaining: number },
): Promise<AutoEditStepResult> {
  let lastError = "";

  for (let attempt = 0; attempt <= AUTO_EDIT_CONFIG.maxRetriesPerStep; attempt++) {
    if (budget.remaining <= 0) {
      return {
        operationId: opId,
        title,
        applied: false,
        reason,
        error: "Model call budget exceeded for this Auto Edit run.",
      };
    }

    try {
      budget.remaining -= 1;
      const stepInput = buildStepForOperation(opId, currentImageUrl, imageQuality);
      const res = await withTimeout(
        generate(stepInput),
        AUTO_EDIT_CONFIG.stepTimeoutMs,
        `Auto Edit step ${opId}`,
      );

      if (!res?.outputUrl || !res.outputUrl.startsWith("https://")) {
        throw new Error("Generation returned an invalid output URL.");
      }

      return {
        operationId: opId,
        title,
        applied: true,
        reason,
        outputUrl: res.outputUrl,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Permanent failures: no retry
      if (/Not enough credits|authentication|out of credits|safety filter/i.test(lastError)) {
        break;
      }
      if (attempt < AUTO_EDIT_CONFIG.maxRetriesPerStep) {
        await new Promise((r) => setTimeout(r, AUTO_EDIT_CONFIG.retryBaseDelayMs * (attempt + 1)));
      }
    }
  }

  return {
    operationId: opId,
    title,
    applied: false,
    reason,
    error: lastError || "Unknown error executing Auto Edit step.",
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
    // analysis / plan intentionally omitted — pre-analysis failure
    steps: [],
    finalImageUrl: originalUrl,
    changed: false,
    modelCallsUsed: 0,
    statusMessages,
    error,
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

  if (typeof input.generate !== "function") {
    return emptyFailure(
      input.imageUrl,
      statusMessages,
      "Auto Edit generate adapter is required (existing generateMedia path).",
    );
  }

  const budget = { remaining: AUTO_EDIT_CONFIG.maxTotalModelCalls };

  // ── Probe + validate ────────────────────────────────────────────────
  statusMessages.push("Validating image…");
  const probe = await probeImage(input.imageUrl);
  const validationError = validateProbe(probe);
  if (validationError) {
    return emptyFailure(input.imageUrl, statusMessages, validationError);
  }

  const dims =
    input.width && input.height && input.width > 0 && input.height > 0
      ? {
          width: input.width,
          height: input.height,
          aspectRatio: input.width / input.height,
          megapixels: (input.width * input.height) / 1_000_000,
        }
      : probe.dimensions;

  // ── Analysis (existing analyze.server) ──────────────────────────────
  statusMessages.push("Analyzing image…");
  if (budget.remaining <= 0) {
    return emptyFailure(input.imageUrl, statusMessages, "Model call budget exhausted before analysis.");
  }
  // Analysis uses Anthropic, not generateMedia budget, but count conservatively
  budget.remaining -= 1;

  let analysis: ImageAnalysisResult;
  try {
    const raw = await analyzeImage(
      input.imageUrl,
      input.anthropicApiKey,
      dims ? { width: dims.width, height: dims.height } : undefined,
    );
    analysis = dims ? { ...raw, dimensions: dims } : raw;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return emptyFailure(input.imageUrl, statusMessages, message);
  }

  // ── Decision (existing decision.buildAutoEditPlan) ──────────────────
  statusMessages.push("Detecting improvements…");
  const plan = buildAutoEditPlan(analysis);

  if (plan.status === "NO_CHANGE" || plan.operations.length === 0) {
    statusMessages.push("Finalizing…");
    return {
      success: true,
      noChange: true,
      noChangeReason: plan.message,
      analysis,
      plan,
      steps: [],
      finalImageUrl: input.imageUrl,
      changed: false,
      modelCallsUsed: 0,
      statusMessages,
    };
  }

  const orderedIds = automaticOperationsInOrder(plan);
  if (orderedIds.length === 0) {
    statusMessages.push("Finalizing…");
    return {
      success: true,
      noChange: true,
      noChangeReason:
        "No operations were auto-selected at this confidence. Use the Image Editor for manual control.",
      analysis,
      plan,
      steps: [],
      finalImageUrl: input.imageUrl,
      changed: false,
      modelCallsUsed: 0,
      statusMessages,
    };
  }

  // ── Sequential execution via existing generateMedia adapter ─────────
  statusMessages.push("Applying automatic enhancements…");
  const stepResults: AutoEditStepResult[] = [];
  let currentUrl = input.imageUrl;
  let modelCallsUsed = 0;

  for (const opId of orderedIds) {
    const meta = plan.operations.find((o) => o.id === opId);
    const title = meta?.title ?? opId;
    const reason = meta?.reason ?? "Automatic improvement";

    const result = await executeStep(
      opId,
      title,
      reason,
      currentUrl,
      imageQuality,
      input.generate,
      budget,
    );
    stepResults.push(result);
    if (result.applied) modelCallsUsed += 1;

    if (!result.applied) {
      statusMessages.push("Finalizing…");
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

  statusMessages.push("Finalizing…");
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
