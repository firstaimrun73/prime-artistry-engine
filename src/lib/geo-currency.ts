/**
 * Display-currency detection from IP country (client display only).
 * Payment amounts must still be validated server-side.
 */
import type { DisplayCurrency } from "@/lib/plans";

const EUR_COUNTRIES = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
  "AD",
  "MC",
  "SM",
  "VA",
  "ME",
  "XK",
]);

export function currencyFromCountryCode(code: string | null | undefined): DisplayCurrency {
  const c = (code || "").toUpperCase();
  if (c === "IN") return "INR";
  if (EUR_COUNTRIES.has(c)) return "EUR";
  return "USD";
}

export async function detectDisplayCurrency(): Promise<DisplayCurrency> {
  try {
    const cached = sessionStorage.getItem("motio2edit-geo-currency");
    if (cached === "USD" || cached === "EUR" || cached === "INR") return cached;
  } catch {
    /* ignore */
  }

  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = (await res.json()) as { country_code?: string };
      const cur = currencyFromCountryCode(data.country_code);
      try {
        sessionStorage.setItem("motio2edit-geo-currency", cur);
      } catch {
        /* ignore */
      }
      return cur;
    }
  } catch {
    /* fall through */
  }

  return "USD";
}

export function annualPriceFor(
  monthly: number,
  currency: DisplayCurrency,
  annualUsd: number,
): number {
  if (currency === "USD") return annualUsd;
  // 10× monthly = 2 months free (same ratio as USD annual)
  if (currency === "EUR") return Math.round(monthly * 10 * 100) / 100;
  return Math.round(monthly * 10);
}
