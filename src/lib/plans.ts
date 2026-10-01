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
 */
export type PlanId = "free" | "lite" | "plus" | "pro" | "studio" | "business";

export type PlanDef = {
  id: PlanId;
  name: string;
  credits: number;
  video: boolean;
  priority: boolean;
  bestQuality: boolean;
  price: Partial<Record<Currency, number>>;
  features: string[];
};

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    credits: 40,
    video: false,
    priority: false,
    bestQuality: false,
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      "40 credits / month",
      "Standard Image Studio",
      "Prompt: 2,000 characters",
      "≈ 2 images",
      "Watermark on downloads",
      "Private History — up to 6 hours",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    credits: 350,
    video: true,
    priority: false,
    bestQuality: false,
    price: { USD: 9, EUR: 8.49, INR: 799 },
    features: [
      "350 credits / month",
      "Standard Image Studio",
      "Prompt: 4,000 characters",
      "≈ 14 images or ≈ 3 videos",
      "720p video",
      "No watermark",
      "Private History",
      "Watermark-free downloads",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 750,
    video: true,
    priority: false,
    bestQuality: false,
    price: { USD: 15, EUR: 13.99, INR: 1299 },
    features: [
      "750 credits / month",
      "Standard + Premium Image Studio",
      "Prompt: 4,000 characters",
      "≈ 30 images or ≈ 6 videos",
      "1080p video · music included",
      "No watermark",
      "Private History",
      "Watermark-free downloads",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2500,
    video: true,
    priority: true,
    bestQuality: false,
    price: { USD: 29, EUR: 26.99, INR: 2499 },
    features: [
      "2,500 credits / month",
      "Standard + Premium Image Studio",
      "Up to 10 Premium references",
      "Prompt: 6,000 characters",
      "≈ 100 images or ≈ 20 videos",
      "1080p video · music included",
      "Priority queue · no watermark",
      "Private History",
      "Priority support",
      "Watermark-free downloads",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 5000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 55, EUR: 50.99, INR: 4599 },
    features: [
      "5,000 credits / month",
      "Standard + Premium + Ultra AI",
      "Prompt: 6,000 characters",
      "Ultra AI available",
      "IMAX locked · 8K Max locked · Custom locked",
      "≈ 200 images or ≈ 40 videos",
      "4K video · full music studio",
      "Fastest queue",
      "Private History",
      "Premium support",
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
    price: { USD: 110, EUR: 99.99, INR: 9199 },
    features: [
      "10,000 credits / month",
      "Standard + Premium + Ultra AI",
      "Prompt: Unlimited*",
      "IMAX, 8K Max, Custom aspects",
      "Advanced Image, Video and Music studios",
      "Latest AI features and editor improvements",
      "Upcoming AI feature updates",
      "Priority access to new tools as they ship",
      "4K Ultra image and video generation",
      "No ads",
      "No watermark",
      "VIP Master Studio badge and priority support",
      "Private History",
      "Watermark-free downloads",
    ],
  },
];

/** Plans shown on the public pricing page (backend ids preserved for subscribers). */
export const PRICING_SHOW_PLAN_IDS: PlanId[] = ["free", "lite", "plus", "pro", "studio", "business"];

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 40,
  lite: 350,
  plus: 750,
  pro: 2500,
  studio: 5000,
  business: 10000,
};

export const CREDIT_COST = {
  image: 20,
  video: 80,
  music: 30,
  video_enhance: 40,
} as const;

export type DisplayCurrency = "USD" | "EUR" | "INR";
export const DISPLAY_CURRENCIES: DisplayCurrency[] = ["USD", "EUR", "INR"];

export const DISPLAY_PRICES: Record<PlanId, Record<DisplayCurrency, number>> = {
  free: { USD: 0, EUR: 0, INR: 0 },
  lite: { USD: 9, EUR: 8.49, INR: 799 },
  plus: { USD: 15, EUR: 13.99, INR: 1299 },
  pro: { USD: 29, EUR: 26.99, INR: 2499 },
  studio: { USD: 55, EUR: 50.99, INR: 4599 },
  business: { USD: 110, EUR: 99.99, INR: 9199 },
};

export function getPlan(id: string | null | undefined): PlanDef {
  const found = PLANS.find((p) => p.id === id);
  return found ?? PLANS[0];
}

export function toCheckoutCurrency(c: DisplayCurrency): Currency {
  return c;
}

export function findPlan(id: string | null | undefined): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}
