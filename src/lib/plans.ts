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
  return credits >= UNLIMITED_CREDITS ? "Unlimited" : String(credits);
}

export function estimatedGenerations(credits: number) {
  return {
    images: Math.floor(credits / CREDIT_COST.image),
    videos: Math.floor(credits / CREDIT_COST.video),
    music: Math.floor(credits / CREDIT_COST.music),
  };
}

export type GenerationType = keyof typeof CREDIT_COST;

export type Plan = {
  id: PlanId;
  name: string;
  credits: number;
  video: boolean;
  priority: boolean;
  bestQuality?: boolean;
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
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      "40 free AI credits",
      "Standard image quality",
      "Basic Music (song + instrumental)",
      "Watermark on exports",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    credits: 500,
    video: false,
    priority: false,
    price: { USD: 9, EUR: 9, INR: 799 },
    features: [
      "500 AI credits / month",
      "All Music modes (Standard)",
      "Limited AI voices",
      "60s music tracks",
      "No watermark on images (Lite rules apply)",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 1200,
    video: true,
    priority: false,
    price: { USD: 19, EUR: 19, INR: 1699 },
    features: [
      "1,200 AI credits / month",
      "All Music modes",
      "More AI voices",
      "90s music tracks",
      "Short video generation",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 3000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 39, EUR: 39, INR: 3499 },
    features: [
      "3,000 AI credits / month",
      "Premium Music quality",
      "All 5 AI voices",
      "120s music tracks",
      "Higher concurrency",
      "Priority queue",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 8000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 79, EUR: 79, INR: 6999 },
    features: [
      "8,000 AI credits / month",
      "Premium Music quality",
      "All 5 AI voices",
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
      "Internal / legacy plan",
      "Not sold on public pricing",
    ],
  },
];

/** Public pricing page plan ids — Business is internal only. */
export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["free", "lite", "plus", "pro", "studio"];

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
