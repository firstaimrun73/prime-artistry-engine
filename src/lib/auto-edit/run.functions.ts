/**
 * Auto Edit server route entry — rule-based analysis + internal step prep.
 * Credits remain on generateMedia. Optional userPrompt is for Image Studio only.
 *
 * NO Anthropic / external vision API on this path.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { prepareAutoEditFromAnalysis } from "./pipeline.service";
import { mergeAutoEditInstructions } from "./mergeInstructions";
import { buildRuleBasedAnalysis } from "./ruleBasedAnalysis";
import type { ImageQuality } from "@/lib/quality-options";

const schema = z.object({
  imageUrl: z.string().url().max(15_000_000),
  imageQuality: z.enum(["hd", "2k", "4k"]).default("hd"),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  /** Optional client luminance 0–1 for better rule-based lighting decisions */
  avgLuminance: z.number().min(0).max(1).optional(),
  /** Optional client contrast 0–1 */
  contrastScore: z.number().min(0).max(1).optional(),
  sceneHint: z.string().max(80).optional(),
  userPrompt: z.string().max(2000).optional(),
  editorCommand: z.string().max(500).optional(),
  context: z.enum(["standalone", "editor"]).default("standalone"),
});

export const prepareAutoEditRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const quality = (data.imageQuality ?? "hd") as ImageQuality;

    // Built-in conditional program only — never Anthropic on this path.
    const analysis = buildRuleBasedAnalysis({
      width: data.width,
      height: data.height,
      avgLuminance: data.avgLuminance,
      contrastScore: data.contrastScore,
      sceneHint: data.sceneHint,
    });

    const prepared = prepareAutoEditFromAnalysis(analysis, quality, data.imageUrl);

    let steps = prepared.steps.map((s) => ({
      operationId: s.operationId,
      strength: s.strength,
      internalPrompt: mergeAutoEditInstructions({
        analysisPrompt: s.internalPrompt,
        userPrompt: data.userPrompt,
        editorCommand: data.editorCommand,
      }),
    }));

    // Image Studio Auto: user prompt / editor command can still drive a step
    // when the plan would otherwise be empty.
    if (
      data.context === "editor" &&
      (data.userPrompt?.trim() || data.editorCommand?.trim()) &&
      steps.length === 0
    ) {
      steps = [
        {
          operationId: "DEFAULT_POLISH",
          strength: 0.55,
          internalPrompt: mergeAutoEditInstructions({
            analysisPrompt:
              "Apply the user's requested edit carefully while preserving identity and composition where not contradicted.",
            userPrompt: data.userPrompt,
            editorCommand: data.editorCommand,
          }),
        },
      ];
    }

    return {
      mode: "rule-based" as const,
      analysisConfidence: analysis.analysisConfidence,
      detectedIssues: prepared.plan.detectedIssues,
      message: prepared.message,
      status: steps.length > 0 ? ("READY" as const) : prepared.status,
      steps,
    };
  });
