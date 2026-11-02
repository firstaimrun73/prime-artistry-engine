// Checkout-side currency (what the payment backends actually charge in).
// Razorpay = India (INR) only. PayPal = international (USD / EUR).
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
  { id: "razorpay", label: "Razorpay", note: "UPI / cards via Razorpay — India (INR) only" },
];

/**
 * Card providers allowed for a checkout currency.
 * Razorpay is India-only (INR). International users only see PayPal.
 */
export function cardProvidersForCurrency(currency: Currency): typeof CARD_PROVIDERS {
  if (currency === "INR") {
    return CARD_PROVIDERS.filter((p) => p.id === "razorpay");
  }
  return CARD_PROVIDERS.filter((p) => p.id === "paypal");
}

export function defaultCardProvider(currency: Currency): CardProvider {
  return currency === "INR" ? "razorpay" : "paypal";
}

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  INR: "₹",
};

/**
 * Plan IDs.
 * - Public commercial plans (Nov 2026): starter, pro, ultra
 * - Legacy IDs kept so existing profile.plan / subscription rows continue to resolve
 *   without forced migration or re-billing: free, lite, plus, studio, business
 * - "pro" is both legacy and current public plan (price/credits updated for NEW purchases only)
 */
export type PlanId =
  | "free"
  | "lite"
  | "plus"
  | "pro"
  | "studio"
  | "business"
  | "starter"
  | "ultra";

/** Model access tier enforced server-side for generation routing. */
export type ModelTier = "standard" | "premium" | "ultra";

export type BillingInterval = "month" | "year";

export const TRANSACTION_FEE: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 85,
};

/** @deprecated Prefer @/lib/billing quote lifecycle for server debits. */
export const CREDIT_COST = {
  image: 25,
  video: 125,
  music: 100,
  music_lite: 50,
  video_enhance: 200,
} as const;

export const UNLIMITED_CREDITS = 9_999_999;

export const FREE_SIGNUP_CREDITS = 40;

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
  /** Model access tier — enforced server-side */
  modelTier: ModelTier;
  price: Record<Currency, number>;
  /** Annual price (USD face). Credits still granted monthly. */
  priceAnnualUSD: number;
  features: string[];
  /** Short positioning line for pricing cards */
  positioning: string;
  /** Whether this plan is offered on the public pricing page for NEW purchases */
  publicOffer: boolean;
};

/**
 * Canonical plan definitions.
 * Public offers (publicOffer: true): starter, pro, ultra only.
 * Legacy plans remain for existing subscribers and admin resolution.
 */
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    credits: FREE_SIGNUP_CREDITS,
    video: false,
    priority: false,
    bestQuality: false,
    modelTier: "standard",
    price: { USD: 0, EUR: 0, INR: 0 },
    priceAnnualUSD: 0,
    publicOffer: false,
    positioning: "Start creating with Standard AI models.",
    features: [
      `${FREE_SIGNUP_CREDITS} starter credits`,
      "Image — Standard mode",
      "Watermark-free downloads",
      "Music Studio limited",
    ],
  },
  // —— NEW PUBLIC PLANS (Nov 2026) ——
  {
    id: "starter",
    name: "Starter",
    credits: 1000,
    video: true,
    priority: false,
    bestQuality: false,
    modelTier: "standard",
    price: { USD: 12, EUR: 11, INR: 999 },
    priceAnnualUSD: 120,
    publicOffer: true,
    positioning:
      "Everything you need to create, edit and enhance images with powerful Standard AI models.",
    features: [
      "1,000 credits / month",
      "Standard Text-to-Image generation",
      "Standard Image-to-Image editing",
      "Standard image enhancement & restoration",
      "Maluto AI",
      "Circle 2edit",
      "Eligible Music Studio tools",
      "Access to AI + Tools",
      "Watermark-free downloads",
      "No disruptive ads",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2500,
    video: true,
    priority: true,
    bestQuality: true,
    modelTier: "premium",
    // New public price for NEW purchases. Existing pro subscribers keep their prior terms.
    price: { USD: 25, EUR: 23, INR: 2099 },
    priceAnnualUSD: 250,
    publicOffer: true,
    positioning:
      "More creative freedom with advanced Premium AI models and higher-quality generation options.",
    features: [
      "2,500 credits / month",
      "Premium Text-to-Image generation",
      "Premium Image-to-Image editing",
      "Advanced image enhancement",
      "Premium restoration options",
      "Maluto AI",
      "Circle 2edit",
      "Eligible Music Studio tools",
      "Access to premium model options",
      "Access to AI + Tools",
      "Priority queue where supported",
      "Watermark-free downloads",
      "No disruptive ads",
    ],
  },
  {
    id: "ultra",
    name: "Ultra AI",
    credits: 8000,
    video: true,
    priority: true,
    bestQuality: true,
    modelTier: "ultra",
    price: { USD: 79, EUR: 73, INR: 6599 },
    priceAnnualUSD: 790,
    publicOffer: true,
    positioning:
      "Experience our highest-tier AI models for advanced creative work and demanding image-generation tasks.",
    features: [
      "8,000 credits / month",
      "Ultra AI model access",
      "Highest-quality eligible generation options",
      "Advanced editing and restoration",
      "Premium enhancement features",
      "Maluto AI",
      "Circle 2edit",
      "Eligible Music Studio tools",
      "Priority processing where technically supported",
      "Access to AI + Tools",
      "Watermark-free downloads",
      "No disruptive ads",
    ],
  },
  // —— LEGACY (kept for existing subscribers; not shown on public pricing) ——
  {
    id: "lite",
    name: "Lite",
    credits: 350,
    video: true,
    priority: false,
    bestQuality: false,
    modelTier: "standard",
    price: { USD: 4.99, EUR: 4.59, INR: 449 },
    priceAnnualUSD: 0,
    publicOffer: false,
    positioning: "Legacy Lite plan.",
    features: [
      "350 credits / month",
      "Maluto AI Restore — just upload",
      "Image Studio — Standard mode",
      "Video Studio — Standard mode",
      "Music Studio — Standard · Song & Instrumental",
      "Circle 2edit · Cropmix · Remove BG",
      "Multi-image (up to 5 references)",
      "Watermark-free downloads",
      "No ads",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 800,
    video: true,
    priority: false,
    bestQuality: false,
    modelTier: "standard",
    price: { USD: 9.99, EUR: 9.19, INR: 899 },
    priceAnnualUSD: 0,
    publicOffer: false,
    positioning: "Legacy Plus plan.",
    features: [
      "800 credits / month",
      "Maluto AI Restore + 2K",
      "Image Studio — Standard mode",
      "Video Studio — Standard mode",
      "Music — Standard · all 6 modes",
      "Longer tracks (up to 90s)",
      "Circle 2edit · Cropmix · Filters",
      "Multi-image (up to 10 references)",
      "Watermark-free downloads",
      "No ads",
    ],
  },
  {
    id: "studio",
    name: "AI Studio",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    modelTier: "ultra",
    price: { USD: 55, EUR: 50.99, INR: 4999 },
    priceAnnualUSD: 0,
    publicOffer: false,
    positioning: "Legacy AI Studio plan.",
    features: [
      "5,000 credits / month",
      "Maluto AI Restore + 8K",
      "Image Studio — Standard + Premium + Ultra AI",
      "Video Studio — Standard + Premium",
      "Music — Premium · all 6 modes · 120s tracks",
      "Higher concurrency · priority queue",
      "Circle 2edit · full toolset · multi-image (10)",
      "Watermark-free downloads",
      "No ads",
    ],
  },
  {
    id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    modelTier: "ultra",
    price: { USD: 110, EUR: 101.99, INR: 9999 },
    priceAnnualUSD: 0,
    publicOffer: false,
    positioning: "Legacy Master Studio plan.",
    features: [
      "10,000 credits / month",
      "Maluto AI Restore + 8K Max",
      "Image — Standard + Premium + full Ultra AI",
      "Video — Standard + Premium",
      "Music — Premium · all 6 modes · longest tracks",
      "IMAX + 8K Max + custom aspect",
      "Highest concurrency & priority",
      "Circle 2edit · every studio tool · multi-image (10)",
      "Master Studio tools · watermark-free",
      "No ads",
    ],
  },
];

/** Only these three appear on the public pricing page. */
export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["starter", "pro", "ultra"];
export const PRICING_POPULAR_PLAN_ID: PlanId = "pro";

/** Purchasable plan IDs for new checkouts (monthly + annual). */
export type PurchasablePlanId = "starter" | "pro" | "ultra";

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: FREE_SIGNUP_CREDITS,
  starter: 1000,
  pro: 2500,
  ultra: 8000,
  // Legacy allocations (existing subscribers keep these)
  lite: 350,
  plus: 800,
  studio: 5000,
  business: 10000,
};

/** Model tier by plan — used for server-side generation guards. */
export const PLAN_MODEL_TIER: Record<PlanId, ModelTier> = {
  free: "standard",
  starter: "standard",
  lite: "standard",
  plus: "standard",
  pro: "premium",
  ultra: "ultra",
  studio: "ultra",
  business: "ultra",
};

export function getModelTier(plan: PlanId | null | undefined): ModelTier {
  if (!plan) return "standard";
  return PLAN_MODEL_TIER[plan] ?? "standard";
}

/** True if the user's plan may use the requested model tier. */
export function canAccessModelTier(
  userPlan: PlanId | null | undefined,
  required: ModelTier,
): boolean {
  const rank: Record<ModelTier, number> = { standard: 0, premium: 1, ultra: 2 };
  const have = rank[getModelTier(userPlan)];
  const need = rank[required];
  return have >= need;
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function findPlan(id: string | undefined | null): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((p) => p.id === id);
}

export type DisplayCurrency = "USD" | "EUR" | "INR";
export const DISPLAY_CURRENCIES: DisplayCurrency[] = ["USD", "EUR", "INR"];

export const DISPLAY_PRICES: Record<PlanId, Record<DisplayCurrency, number>> = {
  free: { USD: 0, EUR: 0, INR: 0 },
  starter: { USD: 12, EUR: 11, INR: 999 },
  pro: { USD: 25, EUR: 23, INR: 2099 },
  ultra: { USD: 79, EUR: 73, INR: 6599 },
  // Legacy display (admin / existing account views)
  lite: { USD: 4.99, EUR: 4.59, INR: 449 },
  plus: { USD: 9.99, EUR: 9.19, INR: 899 },
  studio: { USD: 55, EUR: 50.99, INR: 4999 },
  business: { USD: 110, EUR: 101.99, INR: 9999 },
};

/** Annual USD prices for public plans (2 months free vs monthly). */
export const DISPLAY_ANNUAL_PRICES_USD: Record<PurchasablePlanId, number> = {
  starter: 120,
  pro: 250,
  ultra: 790,
};

export function annualSavingsMonths(): number {
  return 2;
}

export function toCheckoutCurrency(c: DisplayCurrency): Currency {
  return c;
}

/** Resolve credits granted per billing period (always monthly allocation). */
export function monthlyCreditsForPlan(planId: PlanId): number {
  return PLAN_CREDITS[planId] ?? 0;
}
