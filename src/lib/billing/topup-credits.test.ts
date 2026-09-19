import { describe, expect, test } from "bun:test";
import { creditsForTopup, topupBonus } from "./topup-credits";

describe("creditsForTopup (Phase 4 table)", () => {
  const cases: Array<[number, number, number]> = [
    [2, 150, 0],
    [5, 375, 0],
    [10, 750, 0],
    [20, 1500, 0],
    [49, 3675, 0],
    [50, 3937, 0.05],
    [100, 8100, 0.08],
    [250, 20625, 0.1],
    [500, 42000, 0.12],
    [1000, 84000, 0.12],
  ];
  for (const [usd, credits, bonus] of cases) {
    test(`$${usd} → ${credits} credits (bonus ${bonus * 100}%)`, () => {
      expect(topupBonus(usd)).toBe(bonus);
      expect(creditsForTopup(usd)).toBe(credits);
    });
  }

  test("rejects out of range and non-integers", () => {
    expect(creditsForTopup(1)).toBeNull();
    expect(creditsForTopup(1001)).toBeNull();
    expect(creditsForTopup(2.5)).toBeNull();
  });
});
