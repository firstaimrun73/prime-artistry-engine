import { describe, expect, it } from "vitest";
import {
  assessRestorationOutput,
  buildMalutoStages,
  buildIntelligentRestorationPrompt,
} from "./maluto-stages";
import type { GeminiAutoEditAnalysis } from "./gemini-analysis.types";
import { fitWithinMegapixels, MALUTO_MAX_PIXELS } from "./normalize-image";

const sample: GeminiAutoEditAnalysis = {
  image_type: "old_photo",
  issues: ["scratches on left", "faded colours", "soft blur on face", "dust spots"],
  recommended_actions: ["repair scratches", "restore colour", "gentle face clarity"],
  final_edit_prompt: "Restore this vintage photograph carefully.",
  confidence: 0.86,
  no_change: false,
  restoration_needed: true,
  color_restoration_needed: true,
  face_improvement_needed: true,
  background_cleanup_needed: false,
  crop_needed: false,
  crop_instruction: "",
  preserve_elements: ["identity", "faces", "clothing"],
  composition_adjustments: [],
  distractions_to_remove: [],
};

describe("buildMalutoStages layers", () => {
  it("builds stages 1-3 and layers 4-6", () => {
    const b = buildMalutoStages(sample, { width: 1600, height: 1200 });
    expect(b.stage1.width).toBe(1600);
    expect(b.stage3.scratchLikely).toBe(true);
    expect(b.stage3.fadeLikely).toBe(true);
    expect(b.layer4.facialCare).toBe(true);
    expect(b.layer4.mustPreserve.length).toBeGreaterThan(0);
    expect(b.layer5.damagedRegions.length).toBeGreaterThan(0);
    expect(b.layer6.operations.length).toBeGreaterThan(0);
    expect(b.restorationPrompt.toLowerCase()).toContain("preserve");
    expect(b.restorationPrompt.toLowerCase()).toMatch(/scratch|colour|color|face/);
  });

  it("prompt includes avoid redesign", () => {
    const b = buildMalutoStages(sample);
    expect(b.restorationPrompt).toMatch(/Do NOT redesign/i);
  });
});

describe("assessRestorationOutput", () => {
  it("rejects missing url", () => {
    const r = assessRestorationOutput({
      inputUrl: "https://a.com/i.jpg",
      outputUrl: "",
      expectedChange: true,
    });
    expect(r.ok).toBe(false);
  });
  it("flags identical when change expected", () => {
    const r = assessRestorationOutput({
      inputUrl: "https://a.com/i.jpg",
      outputUrl: "https://a.com/i.jpg",
      expectedChange: true,
    });
    expect(r.ok).toBe(false);
  });
});

describe("fitWithinMegapixels", () => {
  it("leaves small images alone", () => {
    expect(fitWithinMegapixels(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitWithinMegapixels(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });
  it("scales 4000x3000 under 2MP", () => {
    const r = fitWithinMegapixels(4000, 3000);
    expect(r.width * r.height).toBeLessThanOrEqual(MALUTO_MAX_PIXELS);
    expect(Math.abs(r.width / r.height - 4000 / 3000)).toBeLessThan(0.02);
  });
  it("scales 6000x4000 under 2MP", () => {
    const r = fitWithinMegapixels(6000, 4000);
    expect(r.width * r.height).toBeLessThanOrEqual(MALUTO_MAX_PIXELS);
  });
});
