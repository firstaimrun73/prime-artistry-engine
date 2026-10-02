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
  PRICING_SHOW_PLAN_IDS,
  PRICING_POPULAR_PLAN_ID,
  type DisplayCurrency,
  type PlanId,
} from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { Check, Coins, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function formatPlanPrice(amount: number, currency: DisplayCurrency): string {
  if (amount === 0) return "Free";
  const symbols: Record<DisplayCurrency, string> = { USD: "$", EUR: "€", INR: "₹" };
  const sym = symbols[currency] ?? "$";
  if (currency === "INR") return `${sym}${Math.round(amount).toLocaleString("en-IN")}`;
  if (Number.isInteger(amount)) return `${sym}${amount}`;
  return `${sym}${amount.toFixed(2)}`;
}

function PricingPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("motio2edit-display-currency");
      if (saved && (DISPLAY_CURRENCIES as string[]).includes(saved)) {
        setCurrency(saved as DisplayCurrency);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const selectPlan = (planId: PlanId) => {
    if (planId === "free") return;
    navigate({
      to: "/checkout",
      search: {
        plan: planId,
        currency: toCheckoutCurrency(currency),
        method: undefined,
      },
    });
  };

  const visiblePlans = PLANS.filter((p) => PRICING_SHOW_PLAN_IDS.includes(p.id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-12 pb-24 md:pb-12">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("pricing.title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t("pricing.lead")}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {DISPLAY_CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setCurrency(code);
                try {
                  localStorage.setItem("motio2edit-display-currency", code);
                } catch {
                  /* ignore */
                }
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                currency === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlans.map((plan) => {
            const highlight = plan.id === PRICING_POPULAR_PLAN_ID;
            const isCurrent = profile?.plan === plan.id;
            const raw = DISPLAY_PRICES[plan.id]?.[currency];
            const priceLabel =
              typeof raw === "number" ? formatPlanPrice(raw, currency) : raw ?? "—";

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6",
                  highlight ? "border-primary shadow-md shadow-primary/10" : "border-border",
                )}
              >
                {highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <CrownBadge plan={plan.id} />
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight">{priceLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">per month</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Coins className="h-4 w-4" />
                  {plan.credits.toLocaleString()} credits / month
                </div>
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Watermark-free downloads
                </p>
                {isCurrent ? (
                  <Button className="mt-8 w-full" variant="outline" disabled style={{ marginTop: "auto" }}>
                    Activated
                  </Button>
                ) : (
                  <Button
                    className="mt-8 w-full"
                    variant={highlight ? "default" : "outline"}
                    onClick={() => selectPlan(plan.id)}
                    style={{ marginTop: "auto" }}
                  >
                    {`Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-3 text-center">
          <p className="text-xs text-muted-foreground">
            *Master Studio supports the longest prompts on Motio2edit.
          </p>
          <p className="text-xs text-muted-foreground">
            Secure checkout via Razorpay and PayPal.
          </p>
        </div>
      </div>
      <FooterAd placement="pricing" />
      <Footer />
    </div>
  );
}
