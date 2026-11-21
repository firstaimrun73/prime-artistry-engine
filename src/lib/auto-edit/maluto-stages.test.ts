import { describe, expect, it } from "vitest";
import {
  assessRestorationOutput,
  buildMalutoStages,
  buildIntelligentRestorationPrompt,
} from "./maluto-stages";
import type { GeminiAutoEditAnalysis } from "./gemini-analysis.types";

const sample: GeminiAutoEditAnalysis = {
  image_type: "old_photo",
  issues: ["scratches on face", "faded colours", "mild blur", "dust spots"],
  recommended_actions: ["repair scratches", "restore colour", "gentle sharpen"],
  preserve_elements: ["identity", "faces", "clothing", "composition"],
  composition_adjustments: [],
  restoration_needed: true,
  color_restoration_needed: true,
  face_improvement_needed: true,
  background_cleanup_needed: false,
  distractions_to_remove: [],
  crop_needed: false,
  crop_instruction: "",
  no_change: false,
  confidence: 0.82,
  final_edit_prompt: "Restore this vintage photograph carefully.",
};

describe("buildMalutoStages", () => {
  it("maps technical, understanding, and defect stages", () => {
    const bundle = buildMalutoStages(sample, { width: 1200, height: 900 });
    expect(bundle.stage1.width).toBe(1200);
    expect(bundle.stage1.qualityNotes.length).toBeGreaterThan(0);
    expect(bundle.stage2.vintageLikely).toBe(true);
    expect(bundle.stage3.restorationNeeded).toBe(true);
    expect(bundle.restorationPrompt.length).toBeGreaterThan(20);
    expect(bundle.restorationPrompt).toMatch(/preserve/i);
  });

  it("returns empty prompt on no_change", () => {
    const bundle = buildMalutoStages({ ...sample, no_change: true, final_edit_prompt: "" });
    expect(bundle.noChange).toBe(true);
    expect(bundle.restorationPrompt).toBe("");
  });
});

describe("buildIntelligentRestorationPrompt", () => {
  it("includes user request and preservation locks", () => {
    const s1 = buildMalutoStages(sample).stage1;
    const s2 = buildMalutoStages(sample).stage2;
    const s3 = buildMalutoStages(sample).stage3;
    const p = buildIntelligentRestorationPrompt(sample, s1, s2, s3, "keep grandmother smile");
    expect(p).toMatch(/grandmother/i);
    expect(p).toMatch(/MUST preserve/i);
    expect(p).toMatch(/Do NOT redesign/i);
  });
});

describe("assessRestorationOutput", () => {
  it("rejects missing or non-https output", () => {
    expect(assessRestorationOutput({ inputUrl: "https://a", outputUrl: "", expectedChange: true }).ok).toBe(false);
    expect(
      assessRestorationOutput({ inputUrl: "https://a", outputUrl: "http://x", expectedChange: true }).ok,
    ).toBe(false);
  });

  it("flags identical output when change expected", () => {
    const r = assessRestorationOutput({
      inputUrl: "https://in",
      outputUrl: "https://in",
      expectedChange: true,
    });
    expect(r.ok).toBe(false);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("accepts distinct https output", () => {
    expect(
      assessRestorationOutput({
        inputUrl: "https://in",
        outputUrl: "https://out",
        expectedChange: true,
      }).ok,
    ).toBe(true);
  });
});
