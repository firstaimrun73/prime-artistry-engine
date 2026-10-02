// Checkout-side currency (what the payment backends actually charge in).
// Razorpay handles INR; PayPal handles USD card.
// Crypto / NOWPayments removed from product — do not re-add.
export type Currency = "USD" | "EUR" | "INR";
export type PaymentMethod = "card" | "paypal";

export const ALL_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Credit / Debit Card" },
];

export const CURRENCY_METHODS: Record<Currency, PaymentMethod[]> = {
  INR: ["card"],
  USD: ["card"],
  EUR: ["card"],
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
 * User-facing names may differ (e.g. id "business" displays as "Master Studio",
 * id "studio" displays as "AI Studio").
 * Do not rename the "business" id without a data migration for existing subscribers.
 * "free" remains for signup / profiles.plan only — never shown on the pricing page.
 */
export type PlanId = "free" | "lite" | "plus" | "pro" | "studio" | "business";

export const TRANSACTION_FEE: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 85,
};

// ── Display / marketing credit hints only (NOT server debit authority) ───
/** @deprecated Prefer @/lib/billing quote lifecycle for server debits. */
export const CREDIT_COST = {
  image: 25,
  video: 125,
  music: 100,
  music_lite: 50,
  video_enhance: 200,
} as const;

/** High-balance sentinel used only for display helpers (not an unlimited product promise). */
export const UNLIMITED_CREDITS = 9_999_999;

/** Free signup bonus — MUST match public.handle_new_user() in Supabase. Not a priced plan. */
export const FREE_SIGNUP_CREDITS = 40;

/**
 * Legacy single-pack marketing object for old checkout links.
 * Authoritative pack math lives in @/lib/credit-topups (1 credit = $0.0178).
 */
export const CREDIT_TOPUP = {
  id: "credit-topup-499",
  name: "Credit Top-up",
  price: 4.99,
  credits: 280,
  type: "one_time" as const,
  description: "280 AI credits, valid forever, works with any plan.",
  bullets: [
    "280 AI credits",
    "Valid forever (no expiry)",
    "Works with any plan",
    "Can be purchased multiple times",
  ],
} as const;

export function creditsLabel(credits: number): string {
  return credits >= UNLIMITED_CREDITS ? "Unlimited" : String(credits);
}

export function estimatedGenerations(credits: number) {
  return {
    images: Math.floor(credits / CREDIT_COST.image),
    videos: Math.floor(credits / CREDIT_COST.video),
    music: Math.floor(credits / CREDIT_COST.music_lite),
  };
}

export type GenerationType = keyof typeof CREDIT_COST;

export type Plan = {
  id: PlanId;
  name: string;
  credits: number;
  video: boolean;
  priority: boolean;
  bestQuality: boolean;
  price: Record<Currency, number>;
  features: string[];
};

/**
 * Paid plans (pricing page):
 *   Lite $4.99 / 350 · Plus $9.99 / 800 · Pro $29.99 / 2,500
 *   AI Studio $55 / 5,000 · Master Studio $110 / 10,000
 * Free stays in the array for profile.plan === "free" only — not sold.
 *
 * Modes:
 *   Image: Standard · Premium · Ultra AI
 *   Video: Standard · Premium
 *   Music: Standard · Premium + 6 generation categories (Song, Instrumental, Voiceover, SFX, BGM, AI Voice)
 *   + Circle 2edit, Cropmix, Remove BG, Auto Edit, Filters, multi-image
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    credits: FREE_SIGNUP_CREDITS,
    video: false,
    priority: false,
    bestQuality: false,
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      `${FREE_SIGNUP_CREDITS} starter credits`,
      "Image Studio — Standard mode",
      "Watermark-free downloads",
      "Music Studio limited",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    credits: 350,
    video: true,
    priority: false,
    bestQuality: false,
    price: { USD: 4.99, EUR: 4.59, INR: 449 },
    features: [
      "350 credits / month",
      "Image Studio — Standard mode",
      "Video Studio — Standard mode",
      "Music Studio — Standard · Song & Instrumental",
      "Circle 2edit · Cropmix · Remove BG",
      "Multi-image (up to 5 references)",
      "Watermark-free downloads",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 800,
    video: true,
    priority: false,
    bestQuality: false,
    price: { USD: 9.99, EUR: 9.19, INR: 899 },
    features: [
      "800 credits / month",
      "Image Studio — Standard mode",
      "Video Studio — Standard mode",
      "Music — Standard · all 6 modes (Song, Instrumental, Voiceover, SFX, BGM, AI Voice)",
      "Longer tracks (up to 90s)",
      "Circle 2edit · Cropmix · Auto Edit · Filters",
      "Multi-image (up to 10 references)",
      "Watermark-free downloads",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2500,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 29.99, EUR: 27.49, INR: 2699 },
    features: [
      "2,500 credits / month",
      "Image Studio — Standard + Premium",
      "Video Studio — Standard + Premium",
      "Music — Premium quality · all 6 generation modes",
      "Priority queue · longer video clips",
      "120s music tracks",
      "Circle 2edit · all image tools · multi-image (10)",
      "Watermark-free downloads",
    ],
  },
  {
    id: "studio",
    name: "AI Studio",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 55, EUR: 50.99, INR: 4999 },
    features: [
      "5,000 credits / month",
      "Image Studio — Standard + Premium + Ultra AI",
      "Video Studio — Standard + Premium",
      "Music — Premium · all 6 modes · 120s tracks",
      "Higher concurrency · priority queue",
      "Circle 2edit · full toolset · multi-image (10)",
      "Watermark-free downloads",
    ],
  },
  {
    id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 110, EUR: 101.99, INR: 9999 },
    features: [
      "10,000 credits / month",
      "Image — Standard + Premium + full Ultra AI",
      "Video — Standard + Premium",
      "Music — Premium · all 6 modes · longest tracks",
      "IMAX + 8K Max + custom aspect",
      "Highest concurrency & priority",
      "Circle 2edit · every studio tool · multi-image (10)",
      "Master Studio tools · watermark-free",
    ],
  },
];

/** Public pricing page — paid plans only (no Free card). */
export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["lite", "plus", "pro", "studio", "business"];

/** Single plan highlighted as Popular on the pricing page. */
export const PRICING_POPULAR_PLAN_ID: PlanId = "pro";

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: FREE_SIGNUP_CREDITS,
  lite: 350,
  plus: 800,
  pro: 2500,
  studio: 5000,
  business: 10000,
};

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function findPlan(id: string | undefined | null): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((p) => p.id === id);
}

/** Display currency for pricing UI (same set as checkout Currency). */
export type DisplayCurrency = "USD" | "EUR" | "INR";

export const DISPLAY_CURRENCIES: DisplayCurrency[] = ["USD", "EUR", "INR"];

export const DISPLAY_PRICES: Record<PlanId, Record<DisplayCurrency, number>> = {
  free: { USD: 0, EUR: 0, INR: 0 },
  lite: { USD: 4.99, EUR: 4.59, INR: 449 },
  plus: { USD: 9.99, EUR: 9.19, INR: 899 },
  pro: { USD: 29.99, EUR: 27.49, INR: 2699 },
  studio: { USD: 55, EUR: 50.99, INR: 4999 },
  business: { USD: 110, EUR: 101.99, INR: 9999 },
};

/** Map display currency → payment backend currency. */
export function toCheckoutCurrency(c: DisplayCurrency): Currency {
  return c;
}
