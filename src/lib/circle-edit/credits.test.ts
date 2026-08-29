import { describe, it, expect } from "vitest";
import {
  CIRCLE_REMOVE_CREDITS,
  estimateCircleAddCredits,
  normalizeCircleAddProcessingSize,
  baseCreditsForProcessingMP,
} from "@/lib/circle-edit/credits";
import { resolveCircleCharge, assertCircleAddAllowed } from "@/lib/circle-edit/server-charge";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";
import { ADD_ASSETS, findAddAsset, buildAddPrompt } from "@/lib/circle-edit/add-assets";

describe("Circle 2edit credits (PDF bands)", () => {
  it("Remove is flat 25", () => {
    expect(CIRCLE_REMOVE_CREDITS).toBe(25);
    expect(resolveCircleCharge({ circleInstant: true, maskImageUrl: "https://example.com/m.png" })).toBe(25);
  });

  it("Input bands match product table", () => {
    expect(baseCreditsForProcessingMP(0.5)).toBe(25);
    expect(baseCreditsForProcessingMP(1)).toBe(25);
    expect(baseCreditsForProcessingMP(1.5)).toBe(45);
    expect(baseCreditsForProcessingMP(2.5)).toBe(65);
    expect(baseCreditsForProcessingMP(3.5)).toBe(85);
    expect(baseCreditsForProcessingMP(4.5)).toBe(105);
    expect(baseCreditsForProcessingMP(5.5)).toBe(125);
    expect(baseCreditsForProcessingMP(6.5)).toBe(145);
    expect(baseCreditsForProcessingMP(7.5)).toBe(180);
    expect(baseCreditsForProcessingMP(8)).toBe(180);
  });

  it("Total = input + object (4MP example)", () => {
    const q = estimateCircleAddCredits({
      sourceWidth: 2000,
      sourceHeight: 2000,
      assetCreditCost: 85,
    });
    expect(q.baseCredits).toBe(85);
    expect(q.assetCredits).toBe(85);
    expect(q.totalCredits).toBe(170);
  });

  it("Huge source normalized to <=8MP", () => {
    const n = normalizeCircleAddProcessingSize(7680, 4320);
    expect(n.mp).toBeLessThanOrEqual(8.01);
    expect(n.width).toBeLessThanOrEqual(4096);
  });

  it("Free plan Add rejected", () => {
    expect(() =>
      assertCircleAddAllowed({
        isAdmin: false,
        plan: "free",
        maskImageUrl: "https://example.com/m.png",
        circleInstant: false,
      }),
    ).toThrow(/paid plan/i);
  });

  it("UI estimate equals server charge for rose", () => {
    const rose = findAddAsset("rose");
    expect(rose).toBeTruthy();
    const cost = getAssetCreditCost(rose!.id);
    const q = estimateCircleAddCredits({
      sourceWidth: 1000,
      sourceHeight: 1000,
      assetCreditCost: cost,
    });
    const server = resolveCircleCharge({
      circleInstant: false,
      maskImageUrl: "https://example.com/m.png",
      circleAssetId: rose!.id,
      sourceWidth: 1000,
      sourceHeight: 1000,
    });
    expect(server).toBe(q.totalCredits);
  });

  it("500 core assets with prompts", () => {
    expect(ADD_ASSETS.length).toBeGreaterThanOrEqual(500);
    const p = buildAddPrompt({ asset: findAddAsset("rose"), userDetail: "" });
    expect(p).toMatch(/masked region/i);
    expect(p).toMatch(/Rose/i);
  });
});
