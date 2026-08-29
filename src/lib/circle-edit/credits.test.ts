import { describe, it, expect } from "vitest";
import {
  CIRCLE_REMOVE_CREDITS,
  estimateCircleAddCredits,
  normalizeCircleAddProcessingSize,
  baseCreditsForProcessingMP,
} from "@/lib/circle-edit/credits";
import { resolveCircleCharge, assertCircleAddAllowed } from "@/lib/circle-edit/server-charge";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";
import { ADD_ASSETS, findAddAsset } from "@/lib/circle-edit/add-assets";

describe("Circle 2edit credits", () => {
  it("Remove is flat 25", () => {
    expect(CIRCLE_REMOVE_CREDITS).toBe(25);
    expect(
      resolveCircleCharge({
        circleInstant: true,
        maskImageUrl: "https://example.com/m.png",
      }),
    ).toBe(25);
  });

  it("Add ≤2MP base is 25", () => {
    const q = estimateCircleAddCredits({
      sourceWidth: 1000,
      sourceHeight: 1000,
      assetCreditCost: 0,
    });
    expect(q.processingMP).toBeLessThanOrEqual(2);
    expect(q.baseCredits).toBe(25);
    expect(q.totalCredits).toBe(25);
  });

  it("Asset surcharge is added", () => {
    const q = estimateCircleAddCredits({
      sourceWidth: 1000,
      sourceHeight: 1000,
      assetCreditCost: 20,
    });
    expect(q.assetCredits).toBe(20);
    expect(q.totalCredits).toBe(45);
  });

  it("Higher processing MP raises base", () => {
    expect(baseCreditsForProcessingMP(1)).toBe(25);
    expect(baseCreditsForProcessingMP(3)).toBe(30);
    expect(baseCreditsForProcessingMP(5)).toBe(40);
    expect(baseCreditsForProcessingMP(8)).toBe(50);
  });

  it("Huge source is normalized under 8.5MP and 4096 edge", () => {
    const n = normalizeCircleAddProcessingSize(7680, 4320);
    expect(n.width).toBeLessThanOrEqual(4096);
    expect(n.height).toBeLessThanOrEqual(4096);
    expect(n.mp).toBeLessThanOrEqual(8.5 + 0.01);
  });

  it("Free plan Add is rejected server-side", () => {
    expect(() =>
      assertCircleAddAllowed({
        isAdmin: false,
        plan: "free",
        maskImageUrl: "https://example.com/m.png",
        circleInstant: false,
      }),
    ).toThrow(/paid plan/i);
  });

  it("Paid plan Add is allowed", () => {
    expect(() =>
      assertCircleAddAllowed({
        isAdmin: false,
        plan: "plus",
        maskImageUrl: "https://example.com/m.png",
        circleInstant: false,
      }),
    ).not.toThrow();
  });

  it("UI estimate matches resolveCircleCharge", () => {
    const assetId = "dragon";
    const assetCost = getAssetCreditCost(assetId);
    const q = estimateCircleAddCredits({
      sourceWidth: 1920,
      sourceHeight: 1080,
      assetCreditCost: assetCost,
    });
    const server = resolveCircleCharge({
      circleInstant: false,
      maskImageUrl: "https://example.com/m.png",
      circleAssetId: assetId,
      sourceWidth: 1920,
      sourceHeight: 1080,
    });
    expect(server).toBe(q.totalCredits);
  });

  it("Client cannot force zero via missing asset — unknown id still costs", () => {
    expect(getAssetCreditCost("not-a-real-asset-xyz")).toBeGreaterThan(0);
  });

  it("Catalog has 1000+ assets and free set", () => {
    expect(ADD_ASSETS.length).toBeGreaterThanOrEqual(1000);
    const free = ADD_ASSETS.filter((a) => a.isFree || a.creditCost === 0);
    expect(free.length).toBeGreaterThanOrEqual(10);
    expect(findAddAsset("python")?.generationDescriptor.toLowerCase()).toContain("python");
    expect(findAddAsset("cobra")?.generationDescriptor.toLowerCase()).toContain("cobra");
  });
});
