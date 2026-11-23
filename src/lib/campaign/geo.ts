/**
 * Server-side country resolution for campaign eligibility.
 * Trust order: platform geo headers (Vercel/CF) → null (unknown).
 * Client-supplied country is NEVER used as proof of eligibility.
 */

export type GeoResult = {
  country: string | null;
  source: "vercel" | "cloudflare" | "unknown";
};

export function countryFromHeaders(headers: Headers | Record<string, string | undefined>): GeoResult {
  const get = (k: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(k) ?? undefined;
    return headers[k] ?? headers[k.toLowerCase()];
  };

  const vercel = get("x-vercel-ip-country") ?? get("X-Vercel-IP-Country");
  if (vercel && /^[A-Z]{2}$/i.test(vercel)) {
    return { country: vercel.toUpperCase(), source: "vercel" };
  }

  const cf = get("cf-ipcountry") ?? get("CF-IPCountry");
  if (cf && cf !== "XX" && /^[A-Z]{2}$/i.test(cf)) {
    return { country: cf.toUpperCase(), source: "cloudflare" };
  }

  return { country: null, source: "unknown" };
}

/** eligible_countries null/empty = worldwide. Unknown geo denied when list is set. */
export function isCountryEligible(
  country: string | null,
  eligibleCountries: string[] | null | undefined,
): boolean {
  if (!eligibleCountries || eligibleCountries.length === 0) return true;
  if (!country) return false;
  const set = new Set(eligibleCountries.map((c) => c.toUpperCase()));
  return set.has(country.toUpperCase());
}
