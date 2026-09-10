// Checkout-side currency (what the payment backends actually charge in).
// Razorpay handles INR; NOWPayments crypto is priced in USD/EUR.
export type Currency = "USD" | "EUR" | "INR";
export type PaymentMethod = "card" | "crypto" | "paypal";

export const ALL_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Credit / Debit Card" },
  { id: "crypto", label: "Crypto" },
];

export const CURRENCY_METHODS: Record<Currency, PaymentMethod[]> = {
  INR: ["card", "crypto"],
  USD: ["card", "crypto"],
  EUR: ["card", "crypto"],
};

export type CardProvider = "paypal" | "razorpay";
export const CARD_PROVIDERS: { id: CardProvider; label: string; note: string }[] = [
  { id: "paypal", label: "PayPal", note: "Pay with PayPal or any card via PayPal (USD)" },
  { id: "razorpay", label: "Razorpay", note: "Credit / Debit card via Razorpay (INR)" },
];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  INR: "₹",
};

/**
 * Internal plan ids stored in profiles.plan / payments.
 * User-facing names may differ (e.g. id "business" displays as "Master Studio").
 * Do not rename the "business" id without a data migration for existing subscribers.
 */
export type PlanId = "free" | "lite" | "plus" | "pro" | "studio" | "business";

export const TRANSACTION_FEE: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 85,
};

// ── Display / marketing credit hints only ──────────────────────────────────
// NOT the authoritative generation charge. Video charges use server quote
// (provider COGS → MotioCreditPricingEngine). Other products are migrating.
// FINAL ECONOMICS TO BE DESIGNED AFTER CROSS-REVIEW BY CHATGPT + GROK + CLAUDE.
/** @deprecated Do not use for server-side debit amounts. Prefer @/lib/billing quote lifecycle. */
export const CREDIT_COST = {
  image: 25,
  video: 125,
  music: 100,
  music_lite: 50,
  video_enhance: 200,
} as const;

/** High-balance sentinel used only for display helpers (not an unlimited product promise). */
export const UNLIMITED_CREDITS = 9_999_999;

/** Free signup bonus — MUST match public.handle_new_user() in Supabase. */
export const FREE_SIGNUP_CREDITS = 40;

export const CREDIT_TOPUP = {
  id: "credit-topup-499",
  name: "Credit Top-up",
  price: 4.99,
  credits: 320,
  type: "one_time" as const,
  description: "320 AI credits, valid forever, works with any plan.",
  bullets: [
    "320 AI credits",
    "Valid forever (no expiry)",
    "Works with any plan",
    "≈ 12 image edits at 25 credits each",
    "Can be purchased multiple times",
  ],
} as const;

export function creditsLabel(credits: number): string {
  return credits >= UNLIMITED_CREDITS ? "Maximum pool" : credits.toLocaleString();
}

export function estimatedGenerations(credits: number) {
  return {
    images: Math.floor(credits / CREDIT_COST.image),
    videos: Math.floor(credits / CREDIT_COST.video),
    music: Math.floor(credits / CREDIT_COST.music_lite),
  };
}

export type GenerationType = keyof typeof CREDIT_COST;

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: FREE_SIGNUP_CREDITS,
  lite: 200,
  plus: 500,
  pro: 1500,
  studio: 3500,
  business: 8000,
};

export type PlanDef = {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyCredits: number;
  priceUsd: number;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try Motio2edit",
    monthlyCredits: FREE_SIGNUP_CREDITS,
    priceUsd: 0,
    features: ["Signup bonus credits", "Standard image tools", "Watermarked outputs"],
  },
  {
    id: "lite",
    name: "Lite",
    tagline: "Light monthly usage",
    monthlyCredits: PLAN_CREDITS.lite,
    priceUsd: 4.99,
    features: ["Monthly credit allotment", "Image + music tools", "Email support"],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Creators getting started",
    monthlyCredits: PLAN_CREDITS.plus,
    priceUsd: 9.99,
    features: ["More monthly credits", "Video generation access", "Priority queue"],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Serious production",
    monthlyCredits: PLAN_CREDITS.pro,
    priceUsd: 29.99,
    features: ["Large credit pool", "HD / FHD video", "Priority support"],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Teams & heavy use",
    monthlyCredits: PLAN_CREDITS.studio,
    priceUsd: 49.99,
    features: ["Studio-scale credits", "All quality tiers", "Dedicated support"],
  },
  {
    id: "business",
    name: "Master Studio",
    tagline: "Maximum capacity",
    monthlyCredits: PLAN_CREDITS.business,
    priceUsd: 99,
    features: ["Highest monthly credits", "All products", "Account manager"],
  },
];

export function getPlan(id: PlanId | string | null | undefined): PlanDef {
  const found = PLANS.find((p) => p.id === id);
  return found ?? PLANS[0];
}

export type DisplayCurrency =
  | "USD"
  | "INR"
  | "GBP"
  | "EUR"
  | "AED"
  | "AUD"
  | "CAD"
  | "JPY"
  | "SGD";

export const DISPLAY_CURRENCIES: { code: DisplayCurrency; label: string }[] = [
  { code: "USD", label: "USD ($)" },
  { code: "INR", label: "INR (₹)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "AED", label: "AED" },
  { code: "AUD", label: "AUD" },
  { code: "CAD", label: "CAD" },
  { code: "JPY", label: "JPY (¥)" },
  { code: "SGD", label: "SGD" },
];

export function currencyForCountry(country: string | null | undefined): DisplayCurrency {
  const c = (country || "").toUpperCase();
  if (c === "IN") return "INR";
  if (c === "GB") return "GBP";
  if (["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI"].includes(c)) return "EUR";
  if (c === "AE") return "AED";
  if (c === "AU") return "AUD";
  if (c === "CA") return "CAD";
  if (c === "JP") return "JPY";
  if (c === "SG") return "SGD";
  return "USD";
}

export function toCheckoutCurrency(dc: DisplayCurrency): Currency {
  if (dc === "INR") return "INR";
  if (dc === "EUR") return "EUR";
  return "USD";
}

export const DISPLAY_PRICES: Record<PlanId, Record<DisplayCurrency, string>> = {
  free: {
    USD: "$0", INR: "₹0", GBP: "£0", EUR: "€0", AED: "0 AED",
    AUD: "A$0", CAD: "C$0", JPY: "¥0", SGD: "S$0",
  },
  lite: {
    USD: "$4.99", INR: "₹399", GBP: "£3.99", EUR: "€4.49", AED: "18 AED",
    AUD: "A$7.49", CAD: "C$6.49", JPY: "¥749", SGD: "S$6.49",
  },
  plus: {
    USD: "$9.99", INR: "₹849", GBP: "£7.99", EUR: "€8.99", AED: "36 AED",
    AUD: "A$14.99", CAD: "C$12.99", JPY: "¥1,499", SGD: "S$12.99",
  },
  pro: {
    USD: "$29.99", INR: "₹2,499", GBP: "£23.99", EUR: "€27.99", AED: "110 AED",
    AUD: "A$44.99", CAD: "C$39.99", JPY: "¥4,499", SGD: "S$39.99",
  },
  studio: {
    USD: "$49.99", INR: "₹4,199", GBP: "£39.99", EUR: "€45.99", AED: "183 AED",
    AUD: "A$74.99", CAD: "C$64.99", JPY: "¥7,499", SGD: "S$64.99",
  },
  business: {
    USD: "$99", INR: "₹8,299", GBP: "£79.99", EUR: "€89.99", AED: "363 AED",
    AUD: "A$149.99", CAD: "C$129.99", JPY: "¥14,999", SGD: "S$129.99",
  },
};
