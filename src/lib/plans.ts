// Checkout currency helpers + plan definitions for Motio2edit public pricing.
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
  { id: "paypal", label: "PayPal", note: "PayPal or card (USD)" },
  { id: "razorpay", label: "Razorpay", note: "UPI / cards — India (INR)" },
];

export function cardProvidersForCurrency(currency: Currency): typeof CARD_PROVIDERS {
  if (currency === "INR") return CARD_PROVIDERS.filter((p) => p.id === "razorpay");
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

export type PlanId =
  | "free"
  | "lite"
  | "plus"
  | "pro"
  | "studio"
  | "business"
  | "starter"
  | "ultra";

export type ModelTier = "standard" | "premium" | "ultra";
export type BillingInterval = "month" | "year";

export const TRANSACTION_FEE: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 85,
};

export const CREDIT_COST = {
  image: 25,
  video: 125,
  music: 100,
  music_lite: 50,
  video_enhance: 200,
} as const;

export const STANDARD_IMAGE_CREDIT_COST = 25;
export const UNLIMITED_CREDITS = 9_999_999;
export const FREE_SIGNUP_CREDITS = 40;

export const CREDIT_TOPUP = {
  id: "credit-topup-499",
  name: "Credit Top-up",
  price: 4.99,
  credits: 280,
  type: "one_time" as const,
  description: "280 AI credits",
  bullets: ["280 AI credits", "Works with any plan"],
} as const;

export function creditsLabel(credits: number): string {
  return credits >= UNLIMITED_CREDITS ? "Unlimited" : String(credits);
}

export function estimatedStandardImages(credits: number): number {
  return Math.floor(credits / STANDARD_IMAGE_CREDIT_COST);
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
  modelTier: ModelTier;
  price: Record<Currency, number>;
  priceAnnualUSD: number;
  features: string[];
  positioning: string;
  publicOffer: boolean;
};

export const MUSIC_STUDIO_MODE_LABELS = [
  "Song",
  "Instrumental",
  "BGM",
  "Voiceover",
  "SFX",
  "Video music",
] as const;

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
    positioning: "Start with Standard AI.",
    features: [`${FREE_SIGNUP_CREDITS} starter credits`, "Standard image tools"],
  },
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
    positioning: "Standard AI image tools, limited video, and full Music Studio.",
    features: [
      "1,000 credits / month",
      "Standard image generation & editing",
      "AI+ Filters and Styles",
      "Circle 2edit — Remove & Add",
      "Video Studio — SD, up to 5 seconds",
      "Music Studio — all 6 modes",
      "Watermark-free exports",
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
    price: { USD: 25, EUR: 23, INR: 2099 },
    priceAnnualUSD: 250,
    publicOffer: true,
    positioning: "Premium models, Maluto AI, and longer video options.",
    features: [
      "2,500 credits / month",
      "Premium image generation & editing",
      "Maluto AI photo restoration",
      "Circle 2edit — Remove & Add",
      "Video Studio — 5s and 10s",
      "Music Studio — all 6 modes",
      "AI+ Filters and Styles",
      "Priority processing",
      "Watermark-free exports",
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
    positioning: "Highest-tier models and the full Motio2edit toolkit.",
    features: [
      "8,000 credits / month",
      "Ultra AI image models",
      "Premium AI+ Filters and Styles",
      "Maluto AI photo restoration",
      "Circle 2edit — Remove & Add",
      "Video Studio — 5s, 10s, 15s",
      "Music Studio — all 6 modes",
      "Priority processing",
      "Watermark-free exports",
    ],
  },
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
    features: ["350 credits / month"],
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
    features: ["800 credits / month"],
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
    features: ["5,000 credits / month"],
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
    features: ["10,000 credits / month"],
  },
];

export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["starter", "pro", "ultra"];
export const PRICING_POPULAR_PLAN_ID: PlanId = "pro";
export type PurchasablePlanId = "starter" | "pro" | "ultra";

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: FREE_SIGNUP_CREDITS,
  starter: 1000,
  pro: 2500,
  ultra: 8000,
  lite: 350,
  plus: 800,
  studio: 5000,
  business: 10000,
};

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

export function canAccessModelTier(
  userPlan: PlanId | null | undefined,
  required: ModelTier,
): boolean {
  const rank: Record<ModelTier, number> = { standard: 0, premium: 1, ultra: 2 };
  return rank[getModelTier(userPlan)] >= rank[required];
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
  lite: { USD: 4.99, EUR: 4.59, INR: 449 },
  plus: { USD: 9.99, EUR: 9.19, INR: 899 },
  studio: { USD: 55, EUR: 50.99, INR: 4999 },
  business: { USD: 110, EUR: 101.99, INR: 9999 },
};

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

export function monthlyCreditsForPlan(planId: PlanId): number {
  return PLAN_CREDITS[planId] ?? 0;
}
