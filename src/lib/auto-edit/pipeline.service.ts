/**
 * Auto Edit pipeline service (pure TypeScript).
 * Maps analysis → operation plan → analysis-driven internal prompts.
 * Does not call FAL directly — the route/UI uses generateMedia with these instructions.
 */

import type { ImageAnalysisResult } from "./types";
import {
  automaticOperationsInOrder,
  buildAutoEditPlan,
  type AutoEditPlan,
} from "./decision";
import { buildStepForOperation } from "./execute";
import { AUTO_PROMPTS, instructionForOperationId } from "./autoPrompts";
import { buildAutoEditPrompt } from "./promptGenerator";
import type { ImageQuality } from "@/lib/quality-options";
import type { AutoEditOperationId } from "./operations";

export type AutoEditPipelineStatus =
  | "analyzing"
  | "applying_prompts"
  | "generating"
  | "post_processing"
  | "output";

export type PipelineStepPayload = {
  operationId: string;
  /** Internal only — never display in UI as user text */
  internalPrompt: string;
  strength: number;
};

export type PreparedAutoEditRun = {
  plan: AutoEditPlan;
  status: AutoEditPlan["status"];
  steps: PipelineStepPayload[];
  message: string;
};

function promptForStep(
  analysis: ImageAnalysisResult,
  operationId: string,
  catalogFallback?: string,
): string {
  return buildAutoEditPrompt({
    analysis,
    operationId,
    catalogInstruction:
      catalogFallback ?? instructionForOperationId(operationId) ?? undefined,
  });
}

/**
 * After vision/fallback analysis: build plan and resolve internal prompts.
 */
export function prepareAutoEditFromAnalysis(
  analysis: ImageAnalysisResult,
  imageQuality: ImageQuality,
  imageUrl: string,
): PreparedAutoEditRun {
  const plan = buildAutoEditPlan(analysis);

  if (plan.status === "NO_CHANGE" || plan.operations.length === 0) {
    return {
      plan,
      status: "NO_CHANGE",
      steps: [],
      message: plan.message,
    };
  }

  let opIds = automaticOperationsInOrder(plan);

  // Fallback: tag-match against AUTO_PROMPTS if decision selected nothing
  if (opIds.length === 0) {
    const tags = new Set([
      ...plan.detectedIssues,
      ...(analysis.quality.issues ?? []),
      ...(analysis.quality.restorationIssues ?? []),
    ]);
    const matched = AUTO_PROMPTS.filter(
      (p) => p.id !== "DEFAULT_POLISH" && p.matchTags.some((t) => tags.has(t)),
    ).sort((a, b) => b.priority - a.priority);
    opIds = matched.slice(0, 3).map((m) => m.id as AutoEditOperationId);
  }

  if (opIds.length === 0) {
    return {
      plan,
      status: "READY",
      steps: [
        {
          operationId: "DEFAULT_POLISH",
          internalPrompt: promptForStep(analysis, "DEFAULT_POLISH"),
          strength: 0.55,
        },
      ],
      message: "Applying standard Motio2Auto polish.",
    };
  }

  const steps: PipelineStepPayload[] = opIds.map((id) => {
    try {
      const step = buildStepForOperation(id, imageUrl, imageQuality);
      return {
        operationId: id,
        internalPrompt: promptForStep(analysis, id, step.prompt),
        strength: step.strength,
      };
    } catch {
      return {
        operationId: id,
        internalPrompt: promptForStep(analysis, id),
        strength: 0.5,
      };
    }
  });

  return {
    plan,
    status: "READY",
    steps,
    message: `Motio2Auto will apply ${steps.length} internal improvement step(s).`,
  };
}
