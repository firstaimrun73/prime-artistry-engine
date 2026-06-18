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

export type Plan = {
  id: "free" | "pro";
  name: string;
  credits: number;
  video: boolean;
  priority: boolean;
  price: Record<Currency, number>;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    credits: 15,
    video: false,
    priority: false,
    price: { USD: 0, EUR: 0, INR: 0 },
    features: [
      "15 starter credits",
      "Image generation only",
      "Standard processing",
      "Download outputs",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    video: true,
    priority: true,
    price: { USD: 29, EUR: 29, INR: 2400 },
    features: [
      "500 monthly credits",
      "Image + Video generation",
      "Priority processing",
      "Download outputs",
    ],
  },
];

export function getPlan(id: "free" | "pro"): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
