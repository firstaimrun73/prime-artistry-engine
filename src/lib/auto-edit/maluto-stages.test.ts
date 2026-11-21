import { describe, expect, it } from "vitest";
import {
  assessRestorationOutput,
  buildMalutoStages,
  buildIntelligentRestorationPrompt,
} from "./maluto-stages";
import type { GeminiAutoEditAnalysis } from "./gemini-analysis.types";

const sample: GeminiAutoEditAnalysis = {
  image_type: "old_photo",
  issues: ["scratches", "fading", "blur"],
  recommended_actions: ["scratch repair", "fade repair"],
  crop_needed: false,
  crop_instruction: "",
  restoration_needed: true,
  color_restoration_needed: true,
  face_improvement_needed: true,
  background_cleanup_needed: false,
  distractions_to_remove: [],
  composition_adjustments: [],
  preserve_elements: ["identity", "faces"],
  confidence: 0.82,
  no_change: false,
  final_edit_prompt: "Repair scratches and restore faded colours.",
};

describe("maluto stages", () => {
  it("builds three stages", () => {
    const b = buildMalutoStages(sample, { width: 800, height: 600 });
    expect(b.stage1.width).toBe(800);
    expect(b.stage3.restorationNeeded).toBe(true);
    expect(b.restorationPrompt.length).toBeGreaterThan(20);
    expect(b.restorationPrompt).toMatch(/preserve/i);
  });

  it("quality gate flags same URL when change expected", () => {
    const a = assessRestorationOutput({
      inputUrl: "https://a/x.jpg",
      outputUrl: "https://a/x.jpg",
      expectedChange: true,
    });
    expect(a.ok).toBe(false);
  });

  it("prompt includes locks", () => {
    const b = buildMalutoStages(sample);
    const p = buildIntelligentRestorationPrompt(sample, b.stage1, b.stage2, b.stage3);
    expect(p).toMatch(/MUST preserve/i);
    expect(p).toMatch(/Do NOT redesign/i);
  });
});
