import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { PLANS, CURRENCY_SYMBOL, type Currency } from "@/lib/plans";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — MOTIO2EDIT" },
      { name: "description", content: "Simple credit-based pricing. Start free, upgrade for video and priority processing." },
      { property: "og:title", content: "Pricing — MOTIO2EDIT" },
      { property: "og:description", content: "Simple credit-based pricing for AI image and video generation." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<Currency>("USD");

  const selectPlan = (planId: "free" | "pro") => {
    navigate({ to: "/checkout", search: { plan: planId, currency } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Simple, credit-based pricing</h1>
          <p className="mt-3 text-muted-foreground">Pick a plan. Switch currency to see local pricing.</p>
          <div className="mt-6 flex justify-center">
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-card p-8 ${
                plan.id === "pro" ? "border-primary" : "border-border"
              }`}
            >
              {plan.id === "pro" && (
                <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">
                  {CURRENCY_SYMBOL[currency]}
                  {plan.price[currency]}
                </span>
                {plan.id === "pro" && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.id === "pro" ? "default" : "outline"}
                onClick={() => selectPlan(plan.id)}
              >
                {plan.id === "free" ? "Start free" : "Choose Pro"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
