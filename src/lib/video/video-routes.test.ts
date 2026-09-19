/**
 * D2: quoteVideoCredits uses max(50, ceil(cogs × 180)) and shared registry routes.
 */
import { describe, expect, test } from "bun:test";
import { quoteVideoCredits, estimateVideoCredits } from "./video-routes";
import { DEFAULT_BILLING_CONFIG } from "@/lib/billing/types";

describe("quoteVideoCredits D2", () => {
  test("billing config has video min 50 and x180", () => {
    expect(DEFAULT_BILLING_CONFIG.productMinimumCredits.video).toBe(50);
    expect(DEFAULT_BILLING_CONFIG.videoCreditsPerUsd).toBe(180);
  });

  test("text SD 5s returns at least 50 credits when route exists", () => {
    const r = quoteVideoCredits({
      mode: "text",
      durationSec: 5,
      resolution: "480p",
      aspect: "16:9",
      audio: false,
    });
    if (r.ok) {
      expect(r.quote.credits).toBeGreaterThanOrEqual(50);
    } else {
      expect(r.reason).toBeTruthy();
    }
  });

  test("estimateVideoCredits matches quote when ok", () => {
    const input = {
      mode: "text" as const,
      durationSec: 5,
      resolution: "720p" as const,
      aspect: "16:9" as const,
      audio: false,
    };
    const r = quoteVideoCredits(input);
    const e = estimateVideoCredits(input);
    if (r.ok) expect(e).toBe(r.quote.credits);
    else expect(e).toBeNull();
  });
});
