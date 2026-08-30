import { describe, it, expect } from "vitest";
import {
  CIRCLE_REMOVE_CREDITS,
  estimateCircleAddCredits,
  normalizeCircleAddProcessingSize,
  baseCreditsForProcessingMP,
} from "@/lib/circle-edit/credits";
import { resolveCircleCharge, assertCircleAddAllowed } from "@/lib/circle-edit/server-charge";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";
import { ADD_ASSETS, findAddAsset, buildAddPrompt, resolveAssetVariation } from "@/lib/circle-edit/add-assets";
import { resolveCircleAddPrompt } from "@/lib/circle-edit/resolve-circle-add-prompt";

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

  it("exactly 5 controlled test assets", () => {
    expect(ADD_ASSETS.length).toBe(5);
    const ids = ADD_ASSETS.map((a) => a.id).sort();
    expect(ids).toEqual([
      "animal_dog",
      "animal_giraffe",
      "flower_sunflower",
      "insect_butterfly",
      "vehicle_car",
    ].sort());
  });

  it("giraffe resolves by stable id and legacy short id", () => {
    const g1 = findAddAsset("animal_giraffe");
    const g2 = findAddAsset("giraffe");
    expect(g1?.id).toBe("animal_giraffe");
    expect(g2?.id).toBe("animal_giraffe");
    expect(g1!.creditCost).toBe(35);
    expect(g1!.emoji).toBe("🦒");
  });

  it("server prompt resolve is authoritative", () => {
    const r = resolveCircleAddPrompt({ circleAssetId: "animal_giraffe", clientPrompt: "ignored client garbage" });
    expect(r.assetId).toBe("animal_giraffe");
    expect(r.assetName).toBe("Giraffe");
    expect(r.creditCost).toBe(35);
    expect(r.prompt.toLowerCase()).toContain("giraffe");
    expect(r.prompt.toLowerCase()).toMatch(/mask|masked/);
    expect(r.prompt.toLowerCase()).not.toContain("ignored client garbage");
  });

  it("unknown assetId is rejected", () => {
    expect(() => resolveCircleAddPrompt({ circleAssetId: "animal_unicorn" })).toThrow(/unknown/i);
  });

  it("UI estimate equals server charge for giraffe", () => {
    const giraffe = findAddAsset("animal_giraffe");
    expect(giraffe).toBeTruthy();
    const cost = getAssetCreditCost(giraffe!.id);
    expect(cost).toBe(35);
    const q = estimateCircleAddCredits({
      sourceWidth: 1000,
      sourceHeight: 1000,
      assetCreditCost: cost,
    });
    const server = resolveCircleCharge({
      circleInstant: false,
      maskImageUrl: "https://example.com/m.png",
      circleAssetId: giraffe!.id,
      sourceWidth: 1000,
      sourceHeight: 1000,
    });
    expect(server).toBe(q.totalCredits);
  });

  it("all five have unique emojis and backend prompts", () => {
    const emojis = new Set(ADD_ASSETS.map((a) => a.emoji));
    expect(emojis.size).toBe(5);
    for (const a of ADD_ASSETS) {
      expect(a.backendPrompt.length).toBeGreaterThan(80);
      expect(a.negativePrompt.length).toBeGreaterThan(20);
      const p = buildAddPrompt({ asset: a, userDetail: "" });
      expect(p.toLowerCase()).toMatch(/mask|masked/);
    }
  });

  it("car has variation profile with styles and colors", () => {
    const car = findAddAsset("vehicle_car");
    expect(car).toBeTruthy();
    expect(car!.variationProfile.enabled).toBe(true);
    expect(car!.variationProfile.styles.length).toBeGreaterThan(5);
    expect(car!.variationProfile.colors.length).toBeGreaterThan(5);
    expect(car!.backendPrompt.toLowerCase()).toMatch(/ground|tire|perspective|lighting/);
  });

  it("same seed yields same car style/color; different seed can differ", () => {
    const car = findAddAsset("vehicle_car")!;
    const a = resolveAssetVariation(car, 42);
    const b = resolveAssetVariation(car, 42);
    const c = resolveAssetVariation(car, 99);
    expect(a.style).toBe(b.style);
    expect(a.color).toBe(b.color);
    expect(a.seed).toBe(42);
    const same = a.style === c.style && a.color === c.color;
    expect(same).toBe(false);
  });

  it("server resolve includes variation fields for car", () => {
    const r1 = resolveCircleAddPrompt({ circleAssetId: "vehicle_car", seed: 7 });
    const r2 = resolveCircleAddPrompt({ circleAssetId: "vehicle_car", seed: 7 });
    expect(r1.seed).toBe(7);
    expect(r2.seed).toBe(7);
    expect(r1.variationStyle).toBe(r2.variationStyle);
    expect(r1.variationColor).toBe(r2.variationColor);
    expect(r1.prompt.toLowerCase()).toMatch(/vehicle|car/);
    expect(r1.prompt).toContain("Controlled variation");
    expect(r1.prompt.toLowerCase()).toMatch(/not a sticker|not a line drawing|photographed/);
  });

  it("dog variation is controlled not identical across seeds", () => {
    const dog = findAddAsset("animal_dog")!;
    const styles = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => resolveAssetVariation(dog, s).style),
    );
    expect(styles.size).toBeGreaterThan(1);
  });
});
