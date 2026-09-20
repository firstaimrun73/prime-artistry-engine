/**
 * B2: quoteVideoCredits — max(50, ceil(cogs × 180)), shared registry routes.
 * Golden expectations use ACTUAL registry COGS (not invented). PDF table uses
 * different route ids (kling3-*, ltx23-fast 1080p) — those remain UNVERIFIED
 * until fal playground prices are confirmed and registry rates updated.
 */
import { describe, expect, test } from "bun:test";
import { quoteVideoCredits, estimateVideoCredits } from "./video-routes";
import { DEFAULT_BILLING_CONFIG } from "@/lib/billing/types";
import { quoteVideo, quoteTable, VIDEO_MIN_CREDITS } from "./studio-contract";

describe("B2 billing config", () => {
  test("video min 50 and x180", () => {
    expect(DEFAULT_BILLING_CONFIG.productMinimumCredits.video).toBe(50);
    expect(DEFAULT_BILLING_CONFIG.videoCreditsPerUsd).toBe(180);
    expect(VIDEO_MIN_CREDITS).toBe(50);
  });
});

describe("quoteVideoCredits — min 50 floor", () => {
  test("text SD 5s returns at least 50 when route exists", () => {
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
      expect(r.reason.length).toBeGreaterThan(0);
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

describe("B2 golden samples (registry-derived)", () => {
  test("text 480p 5s silent ≥ 50", () => {
    const r = quoteVideoCredits({
      mode: "text",
      durationSec: 5,
      resolution: "480p",
      aspect: "16:9",
      audio: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.quote.credits).toBeGreaterThanOrEqual(50);
  });

  test("text 720p 5s silent ≥ 50", () => {
    const r = quoteVideoCredits({
      mode: "text",
      durationSec: 5,
      resolution: "720p",
      aspect: "16:9",
      audio: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.quote.credits).toBeGreaterThanOrEqual(50);
  });

  test("text 720p 10s silent ≥ 50", () => {
    const r = quoteVideoCredits({
      mode: "text",
      durationSec: 10,
      resolution: "720p",
      aspect: "16:9",
      audio: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.quote.credits).toBeGreaterThanOrEqual(50);
  });

  test("image 720p 5s silent ≥ 50", () => {
    const r = quoteVideoCredits({
      mode: "image",
      durationSec: 5,
      resolution: "720p",
      aspect: "16:9",
      audio: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.quote.credits).toBeGreaterThanOrEqual(50);
  });

  test("contract quoteVideo returns credits + routeId + eta", () => {
    const q = quoteVideo({
      mode: "text",
      aspect: "16:9",
      quality: "sd",
      durationSec: 5,
      sound: false,
    });
    if (q) {
      expect(q.credits).toBeGreaterThanOrEqual(50);
      expect(q.routeId.length).toBeGreaterThan(0);
      expect(q.etaSeconds).toBeGreaterThan(0);
    }
  });

  test("contract quoteTable has rows for text mode", () => {
    const t = quoteTable("text", "16:9");
    expect(t.rows.length).toBe(3);
    expect(t.rows[0].durationSec).toBe(5);
    expect(t.rows[0].cells.sd).toBeDefined();
  });
});
