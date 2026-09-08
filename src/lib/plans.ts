// Checkout-side currency (what the payment backends actually charge in).
// Razorpay handles INR; NOWPayments crypto is priced in USD/EUR.
export type Currency = "USD" | "EUR" | "INR";

export type PaymentMethod = "card" | "crypto";

export const ALL_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Credit / Debit Card" },
  { id: "crypto", label: "Crypto" },
];

export type CardProvider = "paypal" | "razorpay";

export const CARD_PROVIDERS: { id: CardProvider; label: string; note: string }[] = [
  { id: "paypal", label: "PayPal", note: "Pay with PayPal or any card via PayPal (USD)" },
  { id: "razorpay", label: "Razorpay", note: "Credit / Debit card via Razorpay (INR)" },
];

export type DisplayCurrency =
  | "USD"
  | "EUR"
  | "GBP"
  | "INR"
  | "AUD"
  | "CAD"
  | "JPY"
  | "SGD"
  | "AED";

export type PlanId = "free" | "lite" | "plus" | "pro" | "studio" | "business";

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
  currency: "USD" as const,
  description: "320 AI credits, valid forever, works with any plan.",
  features: [
    "320 AI credits",
    "Never expires",
    "Works with any plan",
    "≈ 12 image edits at 25 credits each",
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
      "350 credits / month",
      "≈ 14 image edits or ≈ 2–3 videos",
      "720p video · music included",
      "Circle 2edit · no watermark",
      "Standard queue · email support",
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
      "2,500 credits / month",
      "≈ 100 images or ≈ 20 videos",
      "1080p video · music included",
      "Priority queue · no watermark",
      "90-day history · priority support",
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
      "5,000 credits / month",
      "≈ 200 images or ≈ 40 videos",
      "4K video · full music studio",
      "Fastest queue · commercial license",
      "180-day history · premium support",
    ],
  },
  {
    // Internal id remains "business" for existing subscribers / Stripe mapping.
    id: "business",
    name: "Master Studio",
    credits: 10000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 89.99, INR: 8299 },
    features: [
      "10,000 monthly credits",
      "4K Ultra image and video generation",
      "Full music + voiceover access",
      "Highest priority queue",
      "Extended commercial license",
      "Full history",
      "Dedicated support",
    ],
  },
];

/** Plans shown on the public pricing page (keeps backend ids for existing subscribers). */
export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["free", "lite", "pro", "studio"];

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

export const DISPLAY_CURRENCIES: { code: DisplayCurrency; label: string; symbol: string }[] = [
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "INR", label: "INR (₹)", symbol: "₹" },
  { code: "AUD", label: "AUD (A$)", symbol: "A$" },
  { code: "CAD", label: "CAD (C$)", symbol: "C$" },
  { code: "JPY", label: "JPY (¥)", symbol: "¥" },
  { code: "SGD", label: "SGD (S$)", symbol: "S$" },
  { code: "AED", label: "AED (د.إ)", symbol: "د.إ" },
];

/** Map display currency → checkout currency used by payment backends. */
export function toCheckoutCurrency(c: DisplayCurrency): Currency {
  if (c === "EUR") return "EUR";
  if (c === "INR") return "INR";
  return "USD";
}

export const DISPLAY_PRICES: Record<PlanId, Record<DisplayCurrency, string>> = {
  free: { USD: "$0", EUR: "€0", GBP: "£0", INR: "₹0", AUD: "A$0", CAD: "C$0", JPY: "¥0", SGD: "S$0", AED: "د.إ0" },
  lite: {
    USD: "$4.99",
    EUR: "€4.49",
    GBP: "£3.99",
    INR: "₹399",
    AUD: "A$7.49",
    CAD: "C$6.99",
    JPY: "¥749",
    SGD: "S$6.49",
    AED: "د.إ18",
  },
  plus: {
    USD: "$9.99",
    EUR: "€8.99",
    GBP: "£7.99",
    INR: "₹849",
    AUD: "A$14.99",
    CAD: "C$13.99",
    JPY: "¥1,499",
    SGD: "S$12.99",
    AED: "د.إ37",
  },
  pro: {
    USD: "$29.99",
    EUR: "€27.99",
    GBP: "£24.99",
    INR: "₹2,499",
    AUD: "A$44.99",
    CAD: "C$39.99",
    JPY: "¥4,499",
    SGD: "S$39.99",
    AED: "د.إ110",
  },
  studio: {
    USD: "$49.99",
    EUR: "€45.99",
    GBP: "£39.99",
    INR: "₹4,199",
    AUD: "A$74.99",
    CAD: "C$69.99",
    JPY: "¥7,499",
    SGD: "S$64.99",
    AED: "د.إ185",
  },
  business: {
    USD: "$99",
    EUR: "€89.99",
    GBP: "£79.99",
    INR: "₹8,299",
    AUD: "A$149",
    CAD: "C$139",
    JPY: "¥14,999",
    SGD: "S$129",
    AED: "د.إ365",
  },
};
