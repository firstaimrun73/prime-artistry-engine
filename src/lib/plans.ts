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

export type PlanId = "free" | "pro" | "studio";

// ── Credit economics ──────────────────────────────────────────────
// Costs are tuned so each generation comfortably covers fal.ai/API cost
// and stays profitable as the user base scales (100 → 10,000+).
//   • 1 image  = 12 credits  → Free (50 credits) ≈ 4 images total
//   • 1 video  = 60 credits  → far higher API cost, gated to paid plans
export const CREDIT_COST = {
  image: 12,
  video: 60,
} as const;

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
    credits: 50,
    video: false,
    priority: false,
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      "50 starter credits (~4 images)",
      "Image generation only",
      "Standard processing",
      "Download outputs",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2000,
    video: true,
    priority: true,
    price: { USD: 29, EUR: 29, INR: 2400 },
    features: [
      "2,000 monthly credits",
      "Image + Video generation",
      "Priority processing",
      "Download outputs",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    credits: 8000,
    video: true,
    priority: true,
    bestQuality: true,
    price: { USD: 99, EUR: 99, INR: 8200 },
    features: [
      "8,000 monthly credits",
      "Image + Video generation",
      "Fastest priority queue",
      "Best quality (highest model tier)",
      "Built for heavy users & creators",
    ],
  },
];

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 50,
  pro: 2000,
  studio: 8000,
};

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
