import { describe, expect, it } from "vitest";
import { CHRISTMAS_FIXED_REWARD, CHRISTMAS_FIXED_SESSION_SECONDS } from "./christmas-campaign.types";
import {
  CHRISTMAS_CAMPAIGN_ID,
  CHRISTMAS_REWARD_CREDITS,
  CHRISTMAS_SESSION_SECONDS,
  formatRemaining,
} from "./christmas-campaign";

describe("christmas fixed product rules", () => {
  it("campaign id is stable", () => {
    expect(CHRISTMAS_CAMPAIGN_ID).toBe("christmas-gift-2026");
  });
  it("never awards more than 25", () => {
    expect(CHRISTMAS_REWARD_CREDITS).toBe(25);
    expect(CHRISTMAS_FIXED_REWARD).toBe(25);
  });
  it("session is exactly 600 seconds", () => {
    expect(CHRISTMAS_SESSION_SECONDS).toBe(600);
    expect(CHRISTMAS_FIXED_SESSION_SECONDS).toBe(600);
  });
});

describe("formatRemaining", () => {
  it("formats under a minute", () => expect(formatRemaining(45)).toBe("45s"));
  it("formats mm:ss", () => expect(formatRemaining(125)).toBe("2:05"));
  it("clamps negatives", () => expect(formatRemaining(-3)).toBe("0s"));
});

function capChristmasReward(credits: number | undefined): number | undefined {
  if (credits == null) return undefined;
  return Math.min(Math.max(0, Math.floor(credits)), CHRISTMAS_FIXED_REWARD);
}

describe("reward cap", () => {
  it("caps inflated values to 25", () => {
    expect(capChristmasReward(100)).toBe(25);
    expect(capChristmasReward(25)).toBe(25);
  });
});
