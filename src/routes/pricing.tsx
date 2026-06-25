import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { PLANS, CURRENCY_SYMBOL, type Currency, type PlanId } from "@/lib/plans";
import { Check, CheckCircle2 } from "lucide-react";
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
      { name: "description", content: "Simple credit-based pricing. Start free, upgrade to Pro or Studio for video, priority processing, and best quality." },
      { property: "og:title", content: "Pricing — MOTIO2EDIT" },
      { property: "og:description", content: "Free, Pro, and Studio plans for AI image and video generation." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currency, setCurrency] = useState<Currency>("USD");

  const currentPlan = profile?.plan ?? null;

  const selectPlan = (planId: PlanId) => {
    navigate({ to: "/checkout", search: { plan: planId, currency } });
  };



  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-16">
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

        <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex h-full flex-col rounded-2xl border bg-card p-8 ${
                plan.id === "pro" ? "border-primary" : "border-border"
              }`}
            >
              <div className="mb-3 h-6">
                {plan.id === "pro" && (
                  <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                {plan.id === "studio" && (
                  <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    Best value
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">
                  {CURRENCY_SYMBOL[currency]}
                  {plan.price[currency]}
                </span>
                {plan.id !== "free" && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.id === "pro" ? "default" : "outline"}
                onClick={() => selectPlan(plan.id)}
                style={{ marginTop: "auto" }}
              >
                {plan.id === "free" ? "Start free" : `Choose ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>

      </div>
      <Footer />
    </div>
  );
}
