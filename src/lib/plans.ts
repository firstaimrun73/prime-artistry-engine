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

// ── Credit economics (single source of truth for UI + server) ──────────────
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
    credits: 40,
    video: false,
    priority: false,
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      "40 free credits on signup",
      "AI image generation and editing",
      "Circle to Remove included",
      "Single image per edit",
      "Watermark on outputs",
      "Video and music require upgrade",
      "Community support",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    credits: 350,
    video: true,
    priority: false,
    price: { USD: 4.99, EUR: 4.49, INR: 399 },
    features: [
      "350 credits per month",
      "AI image generation and editing",
      "720p AI video generation",
      "Music generation included",
      "Circle to Remove included",
      "No watermark on downloads",
      "Standard processing",
      "JPG and PNG downloads",
      "Email support",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 750,
    video: true,
    priority: false,
    price: { USD: 9.99, EUR: 8.99, INR: 849 },
    features: [
      "750 monthly credits",
      "HD AI image generation",
      "720p AI video generation",
      "Music generation included",
      "Faster processing",
      "Full history (30 days)",
      "JPG and PNG downloads",
      "Basic commercial use",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2500,
    video: true,
    priority: true,
    price: { USD: 29.99, EUR: 27.99, INR: 2499 },
    features: [
      "2,500 monthly credits",
      "Advanced AI image generation",
      "1080p AI video generation",
      "Music generation included",
      "Priority processing queue",
      "No watermark",
      "Full history (90 days)",
      "2K image downloads",
      "Priority email support",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 49.99, EUR: 45.99, INR: 4199 },
    features: [
      "5,000 monthly credits",
      "Professional AI image generation",
      "4K AI video generation",
      "Full music studio access",
      "Fastest processing queue",
      "Commercial license",
      "Full history (180 days)",
      "All download formats",
      "Premium support",
    ],
  },
  {
    // Internal id remains "business" for DB + payment backward compatibility.
    // User-facing name is Master Studio.
    id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 89.99, INR: 8299 },
    features: [
      "10,000 monthly credits",
      "Advanced Image, Video and Music studios",
      "Latest AI features and editor improvements",
      "Upcoming AI feature updates",
      "Priority access to new tools as they ship",
      "4K Ultra image and video generation",
      "No ads",
      "No watermark",
      "Commercial license",
      "VIP Master Studio badge and priority support",
      "Server-side credit protection still applies",
    ],
  },
];

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 40,
  lite: 350,
  plus: 750,
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
  { code: "AED", label: "AED (د.إ)" },
  { code: "AUD", label: "AUD (A$)" },
  { code: "CAD", label: "CAD (C$)" },
  { code: "JPY", label: "JPY (¥)" },
  { code: "SGD", label: "SGD (S$)" },
];

const EU_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
];

export function currencyForCountry(country: string | null | undefined): DisplayCurrency {
  const c = (country ?? "").toUpperCase();
  if (c === "IN") return "INR";
  if (c === "US") return "USD";
  if (c === "GB") return "GBP";
  if (c === "AE") return "AED";
  if (c === "AU") return "AUD";
  if (c === "CA") return "CAD";
  if (c === "JP") return "JPY";
  if (c === "SG") return "SGD";
  if (EU_COUNTRIES.includes(c)) return "EUR";
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
