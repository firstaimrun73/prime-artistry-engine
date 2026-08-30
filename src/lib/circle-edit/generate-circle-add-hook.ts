/**
 * Production hook: Circle Add preflight for generate.functions.ts
 * Fail-closed before Fal. REMOVE path must not import this module.
 */
import {
  preflightCircleAdd,
  buildCircleAddHistoryMeta,
} from "@/lib/circle-edit/circle-add-pipeline";

export async function resolveCircleAddForGenerate(opts: {
  circleAssetId?: string | null;
  clientPrompt?: string | null;
  imageUrl?: string | null;
  maskImageUrl?: string | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  seed?: number | null;
}): Promise<{ modelPrompt: string; historyMeta: Record<string, unknown> }> {
  const pre = preflightCircleAdd({
    circleAssetId: opts.circleAssetId,
    clientPrompt: opts.clientPrompt,
    imageUrl: opts.imageUrl,
    maskImageUrl: opts.maskImageUrl,
    sourceWidth: opts.sourceWidth,
    sourceHeight: opts.sourceHeight,
    seed: opts.seed,
  });
  if (!pre.ok) {
    throw new Error(pre.reason);
  }
  if (process.env.NODE_ENV !== "production") {
    console.log("[CIRCLE ADD] preflightWired", {
      assetId: pre.resolved.assetId,
      assetName: pre.resolved.assetName,
      seed: pre.resolved.seed,
      model: pre.model,
      totalCredits: pre.credits.totalCredits,
      promptLen: pre.modelPrompt.length,
    });
  }
  return {
    modelPrompt: pre.modelPrompt,
    historyMeta: buildCircleAddHistoryMeta(pre),
  };
}
