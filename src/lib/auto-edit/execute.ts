/**
 * Auto Edit execution helpers (client-safe).
 * Builds per-operation generateMedia inputs; sequential runs feed prior output as next input.
 */

import { getOperationDef, type AutoEditOperationId } from "./operations";
import type { ImageQuality } from "@/lib/quality-options";
import { mergeAutoEditInstructions } from "./mergeInstructions";

export type AutoEditStepInput = {
  prompt: string;
  type: "image";
  imageUrl: string;
  sourceKind: "image";
  strength: number;
  imageQuality: ImageQuality;
};

export function buildStepForOperation(
  opId: AutoEditOperationId,
  imageUrl: string,
  imageQuality: ImageQuality,
  optionalUserNote?: string,
  editorCommand?: string,
): AutoEditStepInput {
  const def = getOperationDef(opId);
  const prompt = mergeAutoEditInstructions({
    analysisPrompt: def.internalPrompt,
    userPrompt: optionalUserNote,
    editorCommand,
  });
  return {
    prompt,
    type: "image",
    imageUrl,
    sourceKind: "image",
    strength: def.strength,
    imageQuality,
  };
}

export type AutoEditExecutionResult = {
  finalUrl: string;
  history: { operationId: AutoEditOperationId; outputUrl: string }[];
};
