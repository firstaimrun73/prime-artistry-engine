import { describe, expect, it } from "vitest";
import {
  CHRISTMAS_CAMPAIGN_ID,
  CHRISTMAS_REWARD_CREDITS,
  CHRISTMAS_SESSION_SECONDS,
  formatRemaining,
} from "./christmas-campaign";

describe("christmas-campaign constants", () => {
  it("rewards exactly 25 credits", () => {
    expect(CHRISTMAS_REWARD_CREDITS).toBe(25);
  });

  it("requires a 10-minute session", () => {
    expect(CHRISTMAS_SESSION_SECONDS).toBe(600);
  });

  it("uses a stable campaign id", () => {
    expect(CHRISTMAS_CAMPAIGN_ID).toBe("christmas-gift-2026");
  });
});

describe("formatRemaining", () => {
  it("formats seconds under a minute", () => {
    expect(formatRemaining(45)).toBe("45s");
  });

  it("formats mm:ss", () => {
    expect(formatRemaining(125)).toBe("2:05");
  });

  it("clamps negative values", () => {
    expect(formatRemaining(-10)).toBe("0s");
  });
});
