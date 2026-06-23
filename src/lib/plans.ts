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
//   • 1 image generation / edit = 25 credits
//   • 1 video generation / edit = 125 credits
export const CREDIT_COST = {
  image: 25,
  video: 125,
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
      "AI image generation & editing",
      "MOTIO2EDIT watermark on outputs",
      "Basic processing queue",
      "Limited history access",
    ],
  },
  {
    id: "plus",
    name: "Starter",
    credits: 900,
    video: true,
    priority: false,
    price: { USD: 9.99, EUR: 9.99, INR: 799 },
    features: [
      "900 monthly credits",
      "Image editing + video editing",
      "Faster processing",
      "Full history workspace",
      "No watermark",
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
      "Priority processing queue",
      "Advanced AI editing + extended video",
      "Full history access",
      "Profile avatar & customization",
      "No watermark",
    ],
  },
  {
    id: "studio",
    name: "Business",
    credits: 9000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 99, INR: 8200 },
    features: [
      "9,000 monthly credits",
      "Fastest priority queue",
      "Commercial usage license",
      "Premium AI models + 4K exports",
      "Full media management & API access",
      "No watermark",
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
