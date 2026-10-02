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

/** Free signup bonus — MUST match public.handle_new_user() in Supabase. */
export const FREE_SIGNUP_CREDITS = 40;

/**
 * Legacy single-pack marketing object for old checkout links.
 * Authoritative pack math lives in @/lib/credit-topups (1 credit = $0.0178).
 * $4.99 → floor(4.99 / 0.0178) = 280 credits.
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
      "Image Studio basics",
      "Watermark-free downloads",
      "Music Studio limited",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    credits: 500,
    video: true,
    priority: false,
    bestQuality: false,
    price: { USD: 9, EUR: 8.49, INR: 799 },
    features: [
      "500 credits / month",
      "Image + Video Studio",
      "Music Studio full modes",
      "Standard quality",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 1200,
    video: true,
    priority: false,
    bestQuality: false,
    price: { USD: 15, EUR: 13.99, INR: 1299 },
    features: [
      "1,200 credits / month",
      "Longer tracks",
      "Image + Video + Music",
      "Standard quality",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 3000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 29, EUR: 26.99, INR: 2499 },
    features: [
      "3,000 credits / month",
      "Premium Music quality",
      "Priority queue",
      "Longer video clips",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 8000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 55, EUR: 50.99, INR: 4599 },
    features: [
      "8,000 credits / month",
      "120s music tracks",
      "Highest concurrency",
      "Priority queue",
    ],
  },
  {
    id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 149, EUR: 149, INR: 12999 },
    features: [
      "10,000 credits / month",
      "Full Ultra AI access",
      "IMAX + 8K Max + Custom aspect",
      "Highest concurrency & priority",
      "Master Studio tools",
    ],
  },
];

/** Public pricing page plan ids — includes Master Studio (internal id business). */
export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["free", "lite", "plus", "pro", "studio", "business"];

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: FREE_SIGNUP_CREDITS,
  lite: 500,
  plus: 1200,
  pro: 3000,
  studio: 8000,
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
  lite: { USD: 9, EUR: 8.49, INR: 799 },
  plus: { USD: 15, EUR: 13.99, INR: 1299 },
  pro: { USD: 29, EUR: 26.99, INR: 2499 },
  studio: { USD: 55, EUR: 50.99, INR: 4599 },
  business: { USD: 149, EUR: 149, INR: 12999 },
};

/** Map display currency → payment backend currency. */
export function toCheckoutCurrency(c: DisplayCurrency): Currency {
  return c;
}
