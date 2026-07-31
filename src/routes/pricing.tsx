import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FooterAd } from "@/components/ads";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { useAuth } from "@/lib/auth";
import {
  PLANS,
  DISPLAY_PRICES,
  DISPLAY_CURRENCIES,
  toCheckoutCurrency,
  type DisplayCurrency,
  type PlanId,
} from "@/lib/plans";
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
      { name: "description", content: "Five simple plans: Free, Starter, Plus, Pro and Business. Auto-detected local pricing, AI image and video generation, and crown member badges." },
      { property: "og:title", content: "Pricing — MOTIO2EDIT" },
      { property: "og:description", content: "Free, Starter, Plus, Pro and Business plans for AI image and video generation." },
    ],
  }),
  component: Pricing,
});

const CURRENCY_KEY = "motio2edit-currency";

const LABELS: Partial<Record<PlanId, { text: string; cls: string }>> = {
  lite: { text: "New — Best Starter", cls: "bg-amber-500 text-white" },
  pro: { text: "Most Popular", cls: "bg-primary text-primary-foreground" },
  business: { text: "Best Value", cls: "bg-emerald-500 text-white" },
};

function Pricing() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");

  const currentPlan = profile?.plan ?? null;

  // Default currency is USD. A saved preference wins; otherwise stay on USD.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CURRENCY_KEY);
    } catch {
      /* ignore */
    }
    if (stored && DISPLAY_CURRENCIES.some((c) => c.code === stored)) {
      setCurrency(stored as DisplayCurrency);
    }
  }, []);

  const changeCurrency = (c: DisplayCurrency) => {
    setCurrency(c);
    try {
      localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* ignore */
    }
  };

  const selectPlan = (planId: PlanId) => {
    navigate({ to: "/checkout", search: { plan: planId, currency: toCheckoutCurrency(currency) } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Choose your plan</h1>
          <p className="mt-3 text-muted-foreground">
            Free forever to start. Upgrade anytime — prices auto-adjust to your region.
          </p>
          <div className="mt-6 flex justify-center">
            <Select value={currency} onValueChange={(v) => changeCurrency(v as DisplayCurrency)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PLANS.filter((p) => planVisible(p.id)).map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const label = LABELS[plan.id];
            const highlight = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={`flex h-full flex-col rounded-2xl border bg-card p-6 ${
                  isCurrent
                    ? "border-primary ring-2 ring-primary"
                    : highlight
                      ? "border-primary"
                      : "border-border"
                }`}
              >
                <div className="mb-3 flex h-6 items-center gap-2">
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Current
                    </span>
                  )}
                  {!isCurrent && label && (
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${label.cls}`}>
                      {label.text}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  <CrownBadge plan={plan.id} />
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{DISPLAY_PRICES[plan.id][currency]}</span>
                  {plan.id !== "free" && <span className="text-sm text-muted-foreground">/mo</span>}
                </div>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>

                {plan.id === "free" ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Free images include watermark protection. Upgrade to download without watermarks.
                  </p>
                ) : (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Watermark-free downloads
                  </p>
                )}



                {isCurrent ? (
                  <Button className="mt-8 w-full" variant="outline" disabled style={{ marginTop: "auto" }}>
                    ✅ Activated
                  </Button>
                ) : (
                  <Button
                    className="mt-8 w-full"
                    variant={highlight ? "default" : "outline"}
                    onClick={() => (plan.id === "free" ? navigate({ to: "/auth", search: { redirect: undefined } }) : selectPlan(plan.id))}
                    style={{ marginTop: "auto" }}
                  >
                    {plan.id === "free"
                      ? profile
                        ? "Free Plan ✅"
                        : "Get Started Free"
                      : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          India is billed in INR via secure card payment. International plans are paid with crypto (USDT / BTC / ETH).
        </p>
      </div>
      <FooterAd />
      <Footer />
    </div>
  );
}
