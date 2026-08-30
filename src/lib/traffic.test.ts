import { describe, expect, it } from "vitest";
import { shouldTrackPath } from "./traffic.functions";
import { DEFAULT_SETTINGS, PLAN_IDS, AD_PLACEMENTS, AD_TARGETS } from "./admin-control.functions";

describe("shouldTrackPath", () => {
  it("tracks public pages", () => {
    expect(shouldTrackPath("/")).toBe(true);
    expect(shouldTrackPath("/pricing")).toBe(true);
    expect(shouldTrackPath("/studio/image")).toBe(true);
  });
  it("skips api and admin", () => {
    expect(shouldTrackPath("/api/public/webhooks/paypal")).toBe(false);
    expect(shouldTrackPath("/admin")).toBe(false);
    expect(shouldTrackPath("/admin/refunds")).toBe(false);
    expect(shouldTrackPath("/lovable/email/auth/webhook")).toBe(false);
  });
});

describe("DEFAULT_SETTINGS fail-closed", () => {
  it("ads disabled by default", () => {
    expect(DEFAULT_SETTINGS.ads.enabled).toBe(false);
  });
  it("covers all plan ids and placements", () => {
    for (const p of PLAN_IDS) expect(DEFAULT_SETTINGS.planVisibility[p]).toBe(true);
    for (const pl of AD_PLACEMENTS) expect(DEFAULT_SETTINGS.ads.placements[pl]).toBe(true);
    expect(AD_TARGETS).toContain("all");
    expect(AD_TARGETS).toContain("free");
    expect(AD_TARGETS).toContain("paid");
    expect(AD_TARGETS).toContain("none");
  });
});
