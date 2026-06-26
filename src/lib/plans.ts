// Checkout-side currency (what the payment backends actually charge in).
// Razorpay handles INR; NOWPayments crypto is priced in USD/EUR.
export type Currency = "USD" | "EUR" | "INR";
export type PaymentMethod = "card" | "crypto";

export const ALL_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Credit / Debit Card" },
  { id: "crypto", label: "Crypto" },
];

// Payment method by checkout currency.
// Card (Razorpay) is temporarily disabled while Paddle is being set up —
// crypto (NOWPayments) is the only live method for everyone right now.
export const CURRENCY_METHODS: Record<Currency, PaymentMethod[]> = {
  INR: ["crypto"],
  USD: ["crypto"],
  EUR: ["crypto"],
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  INR: "₹",
};

export type PlanId = "free" | "plus" | "pro" | "studio" | "business";

/** Flat per-transaction processing fee added to every paid checkout. */
export const TRANSACTION_FEE: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 85,
};

// ── Credit economics ──────────────────────────────────────────────
//   • 1 image generation / edit = 25 credits
//   • 1 video generation / edit = 125 credits
export const CREDIT_COST = {
  image: 25,
  video: 125,
} as const;

/** Sentinel for "unlimited" credits (Business). */
export const UNLIMITED_CREDITS = 9_999_999;

/** Human-readable credits for display ("Unlimited" for the Business sentinel). */
export function creditsLabel(credits: number): string {
  return credits >= UNLIMITED_CREDITS ? "Unlimited" : credits.toLocaleString();
}

/** Rough number of generations a credit balance buys (for plan display). */
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
  /** Highest model/quality tier access. */
  bestQuality?: boolean;
  /** Checkout price (what the payment backend charges). */
  price: Record<Currency, number>;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    credits: 60,
    video: false,
    priority: false,
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      "60 starter credits on signup",
      "Basic AI image generation",
      "720p download quality",
      "Large watermark on outputs",
      "Basic processing queue",
      "Limited history (7 days)",
      "Email support only",
    ],
  },
  {
    id: "plus",
    name: "Starter",
    credits: 500,
    video: true,
    priority: false,
    price: { USD: 9.99, EUR: 8.99, INR: 849 },
    features: [
      "500 monthly credits",
      "AI image generation",
      "1080p download quality",
      "Small corner watermark",
      "Faster processing queue",
      "Full history (30 days)",
      "JPG and PNG download",
      "Basic video generation (480p)",
      "5 videos per month",
      "Change profile picture",
    ],
  },
  {
    id: "pro",
    name: "Plus",
    credits: 2000,
    video: true,
    priority: true,
    price: { USD: 29.99, EUR: 27.99, INR: 2499 },
    features: [
      "2000 monthly credits",
      "Advanced AI image generation",
      "2K download quality",
      "Tiny watermark only",
      "Priority processing queue",
      "Full history (90 days)",
      "JPG PNG WebP download",
      "Video generation (1080p), 20/month",
      "Extended video length (30s)",
      "Priority email support",
    ],
  },
  {
    id: "studio",
    name: "Pro",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 49.99, EUR: 45.99, INR: 4199 },
    features: [
      "5000 monthly credits",
      "Professional AI generation",
      "4K download quality",
      "Micro watermark (barely visible)",
      "Highest priority queue",
      "Full history (180 days)",
      "All formats download",
      "4K video generation, 50/month",
      "Commercial usage license",
      "Profile picture upload & chat support",
    ],
  },
  {
    id: "business",
    name: "Business",
    credits: UNLIMITED_CREDITS,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 89.99, INR: 8299 },
    features: [
      "Unlimited monthly credits",
      "Premium AI generation",
      "4K Ultra download quality",
      "Zero watermark",
      "Dedicated processing queue",
      "Full history forever",
      "All formats + RAW download",
      "4K Ultra video generation (unlimited)",
      "Full commercial license & API access",
      "Team collaboration (5 seats) + dedicated manager",
    ],
  },
];

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 60,
  plus: 500,
  pro: 2000,
  studio: 5000,
  business: UNLIMITED_CREDITS,
};

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

// ── Display currencies (pricing page only) ────────────────────────
// Marketing/display prices in many currencies. Checkout normalises these
// to the supported Currency set above.
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

// Country code → display currency. EU members fall back to EUR.
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

/** Map a display currency to a backend checkout currency. */
export function toCheckoutCurrency(dc: DisplayCurrency): Currency {
  if (dc === "INR") return "INR";
  if (dc === "EUR") return "EUR";
  return "USD";
}

// Pre-formatted display strings per plan per currency (from product spec).
// Keyed by PlanId. Free is always 0.
export const DISPLAY_PRICES: Record<PlanId, Record<DisplayCurrency, string>> = {
  free: {
    USD: "$0", INR: "₹0", GBP: "£0", EUR: "€0", AED: "0 AED",
    AUD: "A$0", CAD: "C$0", JPY: "¥0", SGD: "S$0",
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
