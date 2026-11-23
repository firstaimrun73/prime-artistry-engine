import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { useAuth } from "@/lib/auth";
import {
  PLANS,
  DISPLAY_PRICES,
  DISPLAY_ANNUAL_PRICES_USD,
  toCheckoutCurrency,
  PRICING_SHOW_PLAN_IDS,
  PRICING_POPULAR_PLAN_ID,
  annualSavingsMonths,
  estimatedGenerations,
  type DisplayCurrency,
  type PlanId,
  type PurchasablePlanId,
  type BillingInterval,
  type Plan,
} from "@/lib/plans";
import { isPaidPlan } from "@/lib/policy";
import { useI18n } from "@/lib/i18n";
import { Check, Crown, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { annualPriceFor, detectDisplayCurrency } from "@/lib/geo-currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

function highlightFeatures(plan: Plan): string[] {
  return plan.features.slice(0, 4);
}

function PricingPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [infoPlan, setInfoPlan] = useState<Plan | null>(null);
  const paid = isPaidPlan(profile?.plan);
  const savingsMonths = annualSavingsMonths();

  useEffect(() => {
    let cancelled = false;
    void detectDisplayCurrency().then((c) => {
      if (!cancelled) setCurrency(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectPlan = (planId: PlanId) => {
    if (planId === "free") return;
    navigate({
      to: "/checkout",
      search: {
        plan: planId,
        currency: toCheckoutCurrency(currency),
        method: undefined,
        interval,
      },
    });
  };

  const visiblePlans = PLANS.filter((p) => PRICING_SHOW_PLAN_IDS.includes(p.id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:py-12 md:pb-12">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:mb-3 sm:h-11 sm:w-11">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("pricing.title") || "Pricing"}
          </h1>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground sm:mt-2">
            Simple plans. Monthly or yearly. Prices shown in {currency}.
          </p>
        </div>

        <div className="mt-5 flex justify-center sm:mt-8">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={cn(
                "min-h-[40px] rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                interval === "month"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={cn(
                "min-h-[40px] rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                interval === "year"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yearly
              <span className="ml-1.5 text-[10px] font-bold text-emerald-600">
                {savingsMonths} mo free
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 md:items-stretch md:gap-5">
          {visiblePlans.map((plan) => {
            const isRecommended = plan.id === PRICING_POPULAR_PLAN_ID;
            const isCurrent = profile?.plan === plan.id;
            const monthly = DISPLAY_PRICES[plan.id]?.[currency] ?? 0;
            const annualUsd =
              DISPLAY_ANNUAL_PRICES_USD[plan.id as PurchasablePlanId] ?? monthly * 10;
            const amount =
              interval === "year" ? annualPriceFor(monthly, currency, annualUsd) : monthly;
            const priceLabel = formatPlanPrice(amount, currency);
            const periodLabel = interval === "year" ? "per year" : "per month";
            const creditsNote =
              interval === "year"
                ? `${plan.credits.toLocaleString()} credits / month (billed yearly)`
                : `${plan.credits.toLocaleString()} credits / month`;
            const modeLabel =
              plan.modelTier === "ultra"
                ? "Ultra AI"
                : plan.modelTier === "premium"
                  ? "Premium"
                  : "Standard";
            const highlights = highlightFeatures(plan);

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex w-full flex-col rounded-2xl border bg-card p-4 sm:p-5",
                  isRecommended ? "border-primary/50 shadow-md shadow-primary/10" : "border-border",
                )}
              >
                {isRecommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-background px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Recommended
                  </span>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CrownBadge plan={plan.id} />
                    <h2 className="text-lg font-bold">{plan.name}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoPlan(plan)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={`${plan.name} details`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-3xl font-extrabold tracking-tight">{priceLabel}</p>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
                {interval === "year" && (
                  <p className="mt-0.5 text-[11px] text-emerald-600">
                    Includes {savingsMonths} months free vs monthly
                  </p>
                )}

                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {modeLabel} · {creditsNote}
                </div>

                <ul className="mt-3 flex-1 space-y-1.5">
                  {highlights.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="min-w-0">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="mt-4 w-full" variant="outline" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button className="mt-4 w-full font-semibold" onClick={() => selectPlan(plan.id)}>
                    Get {plan.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-6 max-w-2xl space-y-2 rounded-2xl border border-border bg-muted/30 px-3 py-3 text-sm sm:mt-10 sm:px-6 sm:py-4">
          <p className="font-semibold text-foreground">Good to know</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Yearly billing charges the annual amount once (includes {savingsMonths} months free).
            Credits still renew monthly within the paid year.{" "}
            {paid ? (
              <>
                Top-ups:{" "}
                <Link to="/profile/top-up" className="font-medium text-primary hover:underline">
                  Profile → Credits
                </Link>
                .
              </>
            ) : (
              <>Subscribe first to unlock custom top-ups.</>
            )}
          </p>
        </div>
      </div>

      <Dialog open={!!infoPlan} onOpenChange={(o) => !o && setInfoPlan(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-2xl">
          {infoPlan && (
            <>
              <DialogHeader>
                <DialogTitle>{infoPlan.name} — full details</DialogTitle>
                <DialogDescription className="text-left">
                  {infoPlan.positioning}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-semibold">Credits:</span>{" "}
                  {infoPlan.credits.toLocaleString()} / month
                </p>
                {(() => {
                  const e = estimatedGenerations(infoPlan.credits);
                  return (
                    <p className="text-muted-foreground">
                      ~{e.images} images · ~{e.videos} videos · ~{e.music} music tracks (shared pool)
                    </p>
                  );
                })()}
                <ul className="space-y-1.5">
                  {infoPlan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
