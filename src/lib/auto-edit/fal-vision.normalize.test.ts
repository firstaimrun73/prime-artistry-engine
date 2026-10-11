import { describe, expect, it } from "vitest";
import {
  hasVisibleWorkSignals,
  normalizeGeminiAnalysis,
  parseVisionJson,
  synthesizeEditPrompt,
  FALLBACK_POLISH,
} from "./fal-vision.server";

describe("parseVisionJson", () => {
  it("parses fenced and raw JSON", () => {
    const raw = '```json\n{"no_change": true, "final_edit_prompt": ""}\n```';
    const o = parseVisionJson(raw);
    expect(o.no_change).toBe(true);
  });

  it("throws on malformed content", () => {
    expect(() => parseVisionJson("not json at all")).toThrow();
  });
});

describe("hasVisibleWorkSignals", () => {
  it("detects old-photo restoration", () => {
    expect(hasVisibleWorkSignals({ restoration_needed: true })).toBe(true);
    expect(hasVisibleWorkSignals({ image_type: "old_photo" })).toBe(true);
  });

  it("detects colorization and issues", () => {
    expect(hasVisibleWorkSignals({ color_restoration_needed: true })).toBe(true);
    expect(hasVisibleWorkSignals({ issues: ["blur", "noise"] })).toBe(true);
  });

  it("is false for empty strong photo", () => {
    expect(
      hasVisibleWorkSignals({
        image_type: "photo",
        issues: [],
        recommended_actions: [],
        no_change: true,
      }),
    ).toBe(false);
  });
});

describe("normalizeGeminiAnalysis", () => {
  it("honors genuine no_change for good photos", () => {
    const a = normalizeGeminiAnalysis({
      image_type: "photo",
      issues: [],
      recommended_actions: [],
      no_change: true,
      final_edit_prompt: "",
      confidence: 0.95,
    });
    expect(a.no_change).toBe(true);
    expect(a.final_edit_prompt).toBe("");
  });

  it("overrides false no_change when restoration flags present", () => {
    const a = normalizeGeminiAnalysis({
      image_type: "old_photo",
      issues: ["scratches", "fading"],
      restoration_needed: true,
      color_restoration_needed: true,
      no_change: true,
      final_edit_prompt: "",
      confidence: 0.8,
    });
    expect(a.no_change).toBe(false);
    expect(a.final_edit_prompt.length).toBeGreaterThan(20);
    expect(a.final_edit_prompt.toLowerCase()).toMatch(/restor|coloriz|scratch|fad/);
  });

  it("builds prompt covering underexposed portrait and skin tone", () => {
    const a = normalizeGeminiAnalysis({
      image_type: "portrait",
      issues: ["underexposed", "soft focus"],
      face_improvement_needed: true,
      no_change: false,
      final_edit_prompt: "short",
      confidence: 0.7,
    });
    expect(a.no_change).toBe(false);
    expect(a.final_edit_prompt.toLowerCase()).toMatch(/expos|skin|identity|face/);
  });

  it("includes distraction removal without people", () => {
    const a = normalizeGeminiAnalysis({
      issues: ["clutter"],
      background_cleanup_needed: true,
      distractions_to_remove: ["trash bin in corner"],
      final_edit_prompt: "",
      no_change: false,
    });
    expect(a.no_change).toBe(false);
    expect(a.final_edit_prompt.toLowerCase()).toMatch(/trash|distract|never remove people/);
  });

  it("preserves a strong model final_edit_prompt", () => {
    const prompt =
      "Restore scratches and colorize this B&W portrait with natural skin tones; preserve identity and full frame.";
    const a = normalizeGeminiAnalysis({
      restoration_needed: true,
      color_restoration_needed: true,
      final_edit_prompt: prompt,
      no_change: false,
      confidence: 0.9,
    });
    expect(a.final_edit_prompt).toBe(prompt);
    expect(a.no_change).toBe(false);
  });

  it("handles contradictory empty prompt + issues", () => {
    const a = normalizeGeminiAnalysis({
      issues: ["noise", "color_cast"],
      no_change: true,
      final_edit_prompt: "  ",
      confidence: 0.6,
    });
    expect(a.no_change).toBe(false);
    expect(a.final_edit_prompt.length).toBeGreaterThan(10);
  });
});

describe("synthesizeEditPrompt", () => {
  it("combines restoration + colorization + lighting", () => {
    const p = synthesizeEditPrompt({
      restoration_needed: true,
      color_restoration_needed: true,
      issues: ["underexposed"],
    });
    expect(p.toLowerCase()).toMatch(/restor/);
    expect(p.toLowerCase()).toMatch(/coloriz/);
    expect(p.toLowerCase()).toMatch(/expos|shadow/);
    expect(p.toLowerCase()).toMatch(/skin tone|identity/);
  });
});

describe("FALLBACK_POLISH", () => {
  it("never claims no_change and keeps identity/skin rules", () => {
    expect(FALLBACK_POLISH.no_change).toBe(false);
    expect(FALLBACK_POLISH.confidence).toBeLessThan(0.5);
    expect(FALLBACK_POLISH.final_edit_prompt.toLowerCase()).toMatch(/skin|identity|aspect/);
    expect(FALLBACK_POLISH.issues).toContain("analysis_incomplete");
  });
});
