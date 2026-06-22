// Payment methods available per currency. Visibility-only logic — methods are never removed.
export type Currency = "USD" | "EUR" | "INR";
export type PaymentMethod = "card" | "upi" | "crypto";

export const ALL_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Card (Stripe)" },
  { id: "upi", label: "UPI" },
  { id: "crypto", label: "Crypto" },
];

export const CURRENCY_METHODS: Record<Currency, PaymentMethod[]> = {
  USD: ["card", "crypto"],
  EUR: ["card"],
  INR: ["card", "upi", "crypto"],
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  INR: "₹",
};

export type PlanId = "free" | "plus" | "pro" | "studio";

/** Flat per-transaction processing fee added to every paid checkout. */
export const TRANSACTION_FEE: Record<Currency, number> = {
  USD: 1,
  EUR: 1,
  INR: 85,
};

// ── Credit economics ──────────────────────────────────────────────
// Fixed, predictable pricing. Tuned to comfortably cover fal.ai API cost
// (image edit/generation + video generation) and stay profitable at scale.
//   • 1 image generation / edit = 30 credits
//   • 1 video generation / edit = 100 credits
export const CREDIT_COST = {
  image: 30,
  video: 100,
} as const;

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
  /** Highest model/quality tier access (Studio only). */
  bestQuality?: boolean;
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
      "60 starter credits",
      "~2 image generations",
      "Image generation & editing",
      "MOTIO2EDIT watermark on outputs",
      "Standard processing",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    credits: 900,
    video: false,
    priority: false,
    price: { USD: 9.99, EUR: 9.99, INR: 799 },
    features: [
      "900 monthly credits",
      "~30 image generations",
      "Watermark removable (your choice)",
      "Faster rendering & priority queue",
      "Commercial usage license",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 3000,
    video: true,
    priority: true,
    price: { USD: 29.99, EUR: 29.99, INR: 2400 },
    features: [
      "3,000 monthly credits",
      "~100 images or ~30 videos",
      "Image + Video generation",
      "Watermark removable (your choice)",
      "4K exports & advanced AI models",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 9000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 99, INR: 8200 },
    features: [
      "9,000 monthly credits",
      "~300 images or ~90 videos",
      "Image + Video generation",
      "Watermark removable (your choice)",
      "Premium AI models + API access",
    ],
  },
];

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 60,
  plus: 900,
  pro: 3000,
  studio: 9000,
};

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
