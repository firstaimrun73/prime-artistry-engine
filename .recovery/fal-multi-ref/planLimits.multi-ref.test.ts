import { describe, expect, it } from "vitest";
import {
  canSubmitMultiReference,
  getPlanLimits,
  MULTI_IMAGE_UPGRADE_MESSAGE,
} from "./planLimits";

describe("canSubmitMultiReference", () => {
  it("blocks Free users from submitting multi-reference jobs", () => {
    expect(canSubmitMultiReference("free")).toBe(false);
    expect(canSubmitMultiReference(null)).toBe(false);
    expect(canSubmitMultiReference(undefined)).toBe(false);
  });

  it("allows admin to submit multi-reference even on free", () => {
    expect(canSubmitMultiReference("free", true)).toBe(true);
  });

  it("allows paid plans with maxImages > 1", () => {
    expect(canSubmitMultiReference("lite")).toBe(true);
    expect(canSubmitMultiReference("plus")).toBe(true);
    expect(canSubmitMultiReference("pro")).toBe(true);
    expect(canSubmitMultiReference("studio")).toBe(true);
    expect(canSubmitMultiReference("business")).toBe(true);
  });

  it("still allows Free to select up to plan max images (selection != submit)", () => {
    expect(getPlanLimits("free").maxImages).toBeGreaterThanOrEqual(2);
  });

  it("exposes an upgrade message for blocked submits", () => {
    expect(MULTI_IMAGE_UPGRADE_MESSAGE.toLowerCase()).toMatch(/upgrade|paid/);
  });
});
