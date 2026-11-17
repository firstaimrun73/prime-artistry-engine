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

export type PlanId =
  | "free"
  | "starter"
  | "pro"
  | "business"
  | "lite"
  | "plus"
  | "ai_studio"
  | "master_studio";

export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  credits: number;
  price: { USD: number; EUR: number; INR: number };
  priceAnnualUSD: number | null;
  publicOffer: boolean;
  positioning: string;
  features: string[];
};

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 20,
  starter: 200,
  pro: 600,
  business: 2500,
  lite: 100,
  plus: 400,
  ai_studio: 1000,
  master_studio: 2500,
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Try Motio2edit with limited credits.",
    credits: PLAN_CREDITS.free,
    price: { USD: 0, EUR: 0, INR: 0 },
    priceAnnualUSD: null,
    publicOffer: true,
    positioning: "Start with Standard AI.",
    features: [
      "Limited free credits",
      "Standard image tools",
      "Watermark on free exports",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "Everyday creative work with Standard mode.",
    credits: PLAN_CREDITS.starter,
    price: { USD: 12.99, EUR: 11.99, INR: 1099 },
    priceAnnualUSD: 129.9,
    publicOffer: true,
    positioning: "Standard mode · everyday creative work.",
    features: [
      "Standard image edit & generation",
      "AI+ Filters (core set)",
      "Circle Remove",
      "Short SD video",
      "Instrumental music",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Premium mode for creators.",
    credits: PLAN_CREDITS.pro,
    price: { USD: 24.99, EUR: 22.99, INR: 2099 },
    priceAnnualUSD: 249.9,
    publicOffer: true,
    positioning: "Premium mode · Maluto AI + Circle Add.",
    features: [
      "Premium image edit & generation",
      "Maluto AI photo restoration",
      "Circle Remove & Add",
      "HD video up to 10s",
      "More music modes",
    ],
  },
  {
    id: "business",
    name: "Ultra AI",
    description: "Flagship quality and premium music.",
    credits: PLAN_CREDITS.business,
    price: { USD: 89.99, EUR: 82.99, INR: 7499 },
    priceAnnualUSD: 899.9,
    publicOffer: true,
    positioning: "Ultra AI mode · top models + premium music.",
    features: [
      "Ultra AI image models & enhance",
      "Premium AI+ Filters and Styles",
      "Video up to 15s",
      "Premium music (Song · SFX · Video music)",
      "Priority generation",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    description: "Legacy plan.",
    credits: PLAN_CREDITS.lite,
    price: { USD: 0, EUR: 0, INR: 0 },
    priceAnnualUSD: null,
    publicOffer: false,
    positioning: "Legacy Lite plan.",
    features: [],
  },
  {
    id: "plus",
    name: "Plus",
    description: "Legacy plan.",
    credits: PLAN_CREDITS.plus,
    price: { USD: 0, EUR: 0, INR: 0 },
    priceAnnualUSD: null,
    publicOffer: false,
    positioning: "Legacy Plus plan.",
    features: [],
  },
  {
    id: "ai_studio",
    name: "AI Studio",
    description: "Legacy plan.",
    credits: PLAN_CREDITS.ai_studio,
    price: { USD: 0, EUR: 0, INR: 0 },
    priceAnnualUSD: null,
    publicOffer: false,
    positioning: "Legacy AI Studio plan.",
    features: [],
  },
  {
    id: "master_studio",
    name: "Master Studio",
    description: "Legacy plan.",
    credits: PLAN_CREDITS.master_studio,
    price: { USD: 0, EUR: 0, INR: 0 },
    priceAnnualUSD: null,
    publicOffer: false,
    positioning: "Legacy Master Studio plan.",
    features: [],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  const found = PLANS.find((p) => p.id === id);
  return found ?? PLANS[0]!;
}

export type DisplayCurrency = Currency;

export function toCheckoutCurrency(c: DisplayCurrency): Currency {
  return c;
}

export function monthlyCreditsForPlan(planId: PlanId): number {
  return PLAN_CREDITS[planId] ?? 0;
}

export function estimatePaypalNetUsd(grossUsd: number): {
  gross: number;
  fee: number;
  net: number;
} {
  const fee = grossUsd * 0.044 + 0.3;
  return {
    gross: +grossUsd.toFixed(2),
    fee: +fee.toFixed(2),
    net: +(grossUsd - fee).toFixed(2),
  };
}

export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
