import { describe, expect, it } from "vitest";
import { countryFromHeaders, isCountryEligible } from "./geo";

describe("countryFromHeaders", () => {
  it("reads Vercel country header", () => {
    const h = new Headers({ "x-vercel-ip-country": "IN" });
    expect(countryFromHeaders(h)).toEqual({ country: "IN", source: "vercel" });
  });

  it("reads Cloudflare country header", () => {
    const h = new Headers({ "cf-ipcountry": "US" });
    expect(countryFromHeaders(h)).toEqual({ country: "US", source: "cloudflare" });
  });

  it("returns unknown when absent", () => {
    expect(countryFromHeaders(new Headers()).source).toBe("unknown");
  });
});

describe("isCountryEligible", () => {
  it("allows all when list empty", () => {
    expect(isCountryEligible("US", null)).toBe(true);
    expect(isCountryEligible(null, [])).toBe(true);
  });

  it("requires match when list set", () => {
    expect(isCountryEligible("IN", ["IN", "US"])).toBe(true);
    expect(isCountryEligible("FR", ["IN", "US"])).toBe(false);
  });

  it("denies unknown geo when list is restrictive", () => {
    expect(isCountryEligible(null, ["US"])).toBe(false);
  });
});
