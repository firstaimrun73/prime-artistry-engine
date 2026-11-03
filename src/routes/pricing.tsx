import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  DISPLAY_ANNUAL_PRICES_USD,
  DISPLAY_CURRENCIES,
  toCheckoutCurrency,
  PRICING_SHOW_PLAN_IDS,
  PRICING_POPULAR_PLAN_ID,
  annualSavingsMonths,
  estimatedStandardImages,
  type DisplayCurrency,
  type PlanId,
  type PurchasablePlanId,
  type BillingInterval,
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
  const [interval, setInterval] = useState<BillingInterval>("month");

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
        interval,
      },
    });
  };

  const visiblePlans = PLANS.filter((p) => PRICING_SHOW_PLAN_IDS.includes(p.id));
  const savingsMonths = annualSavingsMonths();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:py-12 md:pb-12">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("pricing.title") || "Pricing"}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Simple plans. Pay once. Credits every month.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                currency === code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Mobile: 1 col · Desktop: 3 equal cols side by side */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 md:items-stretch">
          {visiblePlans.map((plan) => {
            const isRecommended = plan.id === PRICING_POPULAR_PLAN_ID;
            const isCurrent = profile?.plan === plan.id;
            const monthlyUsd = DISPLAY_PRICES[plan.id]?.USD ?? 0;
            const annualUsd =
              DISPLAY_ANNUAL_PRICES_USD[plan.id as PurchasablePlanId] ?? monthlyUsd * 10;
            const imgPerMonth = estimatedStandardImages(plan.credits);
            const imgPerYear = imgPerMonth * 12;

            let priceLabel: string;
            let periodLabel: string;
            if (interval === "year") {
              if (currency === "USD") priceLabel = formatPlanPrice(annualUsd, "USD");
              else if (currency === "EUR")
                priceLabel = formatPlanPrice(Math.round(annualUsd * 0.92), "EUR");
              else priceLabel = formatPlanPrice(Math.round(annualUsd * 83.5), "INR");
              periodLabel = "per year";
            } else {
              const raw = DISPLAY_PRICES[plan.id]?.[currency];
              priceLabel =
                typeof raw === "number" ? formatPlanPrice(raw, currency) : raw ?? "—";
              periodLabel = "per month";
            }

            return (
              <div
                key={plan.id}
                className="relative flex w-full flex-col rounded-2xl border border-border bg-card p-5"
              >
                {isRecommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-background px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Recommended
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <CrownBadge plan={plan.id} />
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                </div>

                <p className="mt-3 text-3xl font-extrabold tracking-tight">{priceLabel}</p>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>

                <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Coins className="h-4 w-4 shrink-0" />
                  {plan.credits.toLocaleString()} credits / month
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {interval === "year" ? (
                    <>
                      ~{imgPerMonth.toLocaleString()} standard images / month
                      <span className="text-foreground/80">
                        {" "}
                        · ~{imgPerYear.toLocaleString()} / year
                      </span>
                    </>
                  ) : (
                    <>~{imgPerMonth.toLocaleString()} standard images / month</>
                  )}
                </p>

                <p className="mt-3 text-xs leading-snug text-muted-foreground">{plan.positioning}</p>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features
                    .filter((f) => !f.toLowerCase().includes("credits / month"))
                    .map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0">{f}</span>
                      </li>
                    ))}
                </ul>

                {isCurrent ? (
                  <Button className="mt-6 w-full" variant="outline" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button className="mt-6 w-full font-semibold" onClick={() => selectPlan(plan.id)}>
                    Buy Now
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-3 rounded-2xl border border-border bg-muted/30 px-4 py-4 text-sm sm:px-6">
          <p className="font-semibold text-foreground">Good to know</p>
          <ul className="space-y-2 text-xs text-muted-foreground sm:text-sm">
            <li>
              <span className="font-medium text-foreground">Images:</span> estimates assume 25
              credits per standard image. Other modes may use more.
            </li>
            <li>
              <span className="font-medium text-foreground">Yearly plans:</span> pay once; credits
              still arrive each month.
            </li>
            <li>
              <span className="font-medium text-foreground">Sponsored ads:</span> only labeled
              Sponsored placements. Free users can earn free credits by watching or clicking
              Sponsored offers where available.
            </li>
            <li>
              <span className="font-medium text-foreground">Credits:</span> valid up to one year from
              grant or purchase date.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Need more?{" "}
            <Link to="/profile/top-up" className="font-medium text-primary hover:underline">
              Buy a credit top-up
            </Link>
          </p>
        </div>
      </div>
      <FooterAd placement="pricing" />
      <Footer />
    </div>
  );
}
