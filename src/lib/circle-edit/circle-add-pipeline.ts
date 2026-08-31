/**
 * Circle Add — single authoritative preflight + request assembly.
 * NEVER trusts client prompt for object identity. NEVER charges on preflight failure.
 * REMOVE path does not enter this module.
 */
import { resolveCircleAddPrompt, type CircleAddResolved } from "@/lib/circle-edit/resolve-circle-add-prompt";
import { validateCircleAddMask, type ClientMaskStats, type MaskValidationOk } from "@/lib/circle-edit/mask-validate";
import { quoteCircleAddCharge } from "@/lib/circle-edit/server-charge";
import type { CircleAddCreditQuote } from "@/lib/circle-edit/credits";

export const CIRCLE_ADD_MODEL = "fal-ai/flux-pro/v1/fill" as const;

export type CircleAddAuditRecord = {
  operation: "circle_add";
  assetId: string;
  assetName: string;
  seed: number;
  variationStyle: string | null;
  variationColor: string | null;
  factors: Record<string, string>;
  model: typeof CIRCLE_ADD_MODEL;
  imageWidth: number;
  imageHeight: number;
  maskWidth: number;
  maskHeight: number;
  maskCoveragePercent: number;
  promptLength: number;
  inputProcessingCredits: number;
  assetCredits: number;
  totalCredits: number;
  timestamp: string;
};

export type CircleAddPreflightOk = {
  ok: true;
  resolved: CircleAddResolved;
  mask: MaskValidationOk;
  credits: CircleAddCreditQuote & { assetId: string; assetName: string; assetCredits: number };
  audit: CircleAddAuditRecord;
  modelPrompt: string;
  model: typeof CIRCLE_ADD_MODEL;
  enhancePrompt: false;
};

export type CircleAddPreflightFail = { ok: false; reason: string };
export type CircleAddPreflightResult = CircleAddPreflightOk | CircleAddPreflightFail;

export function preflightCircleAdd(opts: {
  circleAssetId?: string | null;
  clientPrompt?: string | null;
  seed?: number | null;
  imageUrl?: string | null;
  maskImageUrl?: string | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  clientMaskStats?: ClientMaskStats | null;
  factorSelection?: Record<string, string> | null;
}): CircleAddPreflightResult {
  let resolved: CircleAddResolved;
  try {
    resolved = resolveCircleAddPrompt({
      circleAssetId: opts.circleAssetId,
      clientPrompt: opts.clientPrompt,
      seed: opts.seed,
      factorSelection: opts.factorSelection,
    });
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }

  const mask = validateCircleAddMask({
    imageUrl: opts.imageUrl,
    maskImageUrl: opts.maskImageUrl,
    sourceWidth: opts.sourceWidth,
    sourceHeight: opts.sourceHeight,
    clientMaskStats: opts.clientMaskStats,
  });
  if (!mask.ok) return { ok: false, reason: mask.reason };

  let credits: CircleAddPreflightOk["credits"];
  try {
    credits = quoteCircleAddCharge({
      circleAssetId: resolved.assetId || opts.circleAssetId || "",
      sourceWidth: opts.sourceWidth,
      sourceHeight: opts.sourceHeight,
    });
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }

  const audit: CircleAddAuditRecord = {
    operation: "circle_add",
    assetId: resolved.assetId || credits.assetId,
    assetName: resolved.assetName || credits.assetName,
    seed: resolved.seed ?? 0,
    variationStyle: resolved.variationStyle,
    variationColor: resolved.variationColor,
    factors: resolved.factorSelection,
    model: CIRCLE_ADD_MODEL,
    imageWidth: mask.imageWidth,
    imageHeight: mask.imageHeight,
    maskWidth: mask.maskWidth,
    maskHeight: mask.maskHeight,
    maskCoveragePercent: mask.maskCoveragePercent,
    promptLength: resolved.prompt.length,
    inputProcessingCredits: credits.baseCredits,
    assetCredits: credits.assetCredits,
    totalCredits: credits.totalCredits,
    timestamp: new Date().toISOString(),
  };

  console.log("[CIRCLE ADD] preflightOk", {
    operation: audit.operation,
    assetId: audit.assetId,
    seed: audit.seed,
    factors: audit.factors,
    model: audit.model,
    imageWidth: audit.imageWidth,
    imageHeight: audit.imageHeight,
    maskCoveragePercent: audit.maskCoveragePercent,
    promptLength: audit.promptLength,
    totalCredits: audit.totalCredits,
  });

  return {
    ok: true,
    resolved,
    mask,
    credits,
    audit,
    modelPrompt: resolved.prompt,
    model: CIRCLE_ADD_MODEL,
    enhancePrompt: false,
  };
}

export function buildCircleAddHistoryMeta(preflight: CircleAddPreflightOk): Record<string, unknown> {
  return {
    circle_operation: "add",
    circle_asset_id: preflight.resolved.assetId,
    circle_asset_name: preflight.resolved.assetName,
    circle_seed: preflight.resolved.seed,
    circle_variation_style: preflight.resolved.variationStyle,
    circle_variation_color: preflight.resolved.variationColor,
    circle_factors: preflight.resolved.factorSelection,
    circle_model: preflight.model,
    circle_source_width: preflight.mask.imageWidth,
    circle_source_height: preflight.mask.imageHeight,
    circle_mask_coverage_percent: preflight.mask.maskCoveragePercent,
    circle_input_processing_credits: preflight.credits.baseCredits,
    circle_asset_credits: preflight.credits.assetCredits,
    credits_charged: preflight.credits.totalCredits,
  };
}

export function buildCircleAddFalBody(opts: {
  prompt: string;
  imageUrl: string;
  maskImageUrl: string;
}): Record<string, unknown> {
  return {
    prompt: opts.prompt,
    image_url: opts.imageUrl,
    mask_url: opts.maskImageUrl,
    num_images: 1,
    output_format: "png",
    safety_tolerance: "2",
    enhance_prompt: false,
  };
}
